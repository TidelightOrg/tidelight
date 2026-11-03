create table if not exists public.decision_capsules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  research_run_id uuid,
  schema_version integer not null default 1 check (schema_version = 1),
  original_snapshot jsonb not null check (
    jsonb_typeof(original_snapshot) = 'object'
    and pg_column_size(original_snapshot) <= 262144
  ),
  hash_algorithm text not null default 'sha256' check (hash_algorithm = 'sha256'),
  integrity_hash text not null check (integrity_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  constraint decision_capsules_id_user_unique unique (id, user_id),
  constraint decision_capsules_run_owner_fkey
    foreign key (research_run_id, user_id)
    references public.research_runs(id, user_id)
    on delete set null (research_run_id)
);

create unique index if not exists decision_capsules_one_per_run_idx
  on public.decision_capsules(user_id, research_run_id)
  where research_run_id is not null;
create index if not exists decision_capsules_owner_created_idx
  on public.decision_capsules(user_id, created_at desc);

alter table public.decision_capsules enable row level security;
revoke all on public.decision_capsules from public, anon, authenticated;
revoke all on public.decision_capsules from service_role;
grant select, insert on public.decision_capsules to service_role;

comment on table public.decision_capsules is
  'Private write-once snapshots of completed research decisions. The application hashes canonical JSON; no public links or outcome claims are implied.';
comment on column public.decision_capsules.original_snapshot is
  'Immutable initial evidence and research context captured from an owner-authorized completed research run.';
comment on column public.decision_capsules.integrity_hash is
  'Lowercase SHA-256 hex of canonical original_snapshot JSON using the application canonicalizer.';
