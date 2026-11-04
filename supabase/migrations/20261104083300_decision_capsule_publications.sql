create table if not exists public.decision_capsule_publications (
  id uuid primary key default gen_random_uuid(),
  capsule_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  schema_version integer not null default 1 check (schema_version = 1),
  public_snapshot jsonb not null check (
    jsonb_typeof(public_snapshot) = 'object'
    and pg_column_size(public_snapshot) <= 262144
  ),
  integrity_hash text not null check (integrity_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint decision_capsule_publications_owner_fkey
    foreign key (capsule_id, user_id)
    references public.decision_capsules(id, user_id)
    on delete cascade,
  constraint decision_capsule_publications_revoked_after_creation
    check (revoked_at is null or revoked_at >= created_at)
);

create unique index if not exists decision_capsule_publications_one_active_idx
  on public.decision_capsule_publications(capsule_id)
  where revoked_at is null;
create index if not exists decision_capsule_publications_owner_created_idx
  on public.decision_capsule_publications(user_id, created_at desc);

alter table public.decision_capsule_publications enable row level security;
revoke all on public.decision_capsule_publications from public, anon, authenticated, service_role;
grant select, insert on public.decision_capsule_publications to service_role;
grant update (revoked_at) on public.decision_capsule_publications to service_role;

create or replace function public.prevent_capsule_publication_reactivation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if old.revoked_at is not null or new.revoked_at is null or new.revoked_at < old.created_at then
    raise exception using errcode = '23514', message = 'capsule_publication_revocation_is_final';
  end if;
  return new;
end;
$$;
revoke all on function public.prevent_capsule_publication_reactivation() from public, anon, authenticated, service_role;
create trigger decision_capsule_publication_revocation_is_final
  before update on public.decision_capsule_publications
  for each row execute function public.prevent_capsule_publication_reactivation();

comment on table public.decision_capsule_publications is
  'Revocable bearer links to explicitly selected, redacted public projections of private Decision Capsules. The public projection hash covers disclosed content only.';
comment on column public.decision_capsule_publications.token_hash is
  'SHA-256 of a random 256-bit bearer token; the reusable raw token is returned only at publication time.';
comment on column public.decision_capsule_publications.public_snapshot is
  'Allowlisted public projection. It excludes account identifiers and private storage metadata; publication requires owner confirmation.';
