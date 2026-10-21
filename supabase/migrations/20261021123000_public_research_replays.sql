create table if not exists public.public_research_replays (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null unique default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  research_run_id uuid not null references public.research_runs(id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and pg_column_size(payload) <= 131072),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  revoked_at timestamptz,
  constraint public_research_replays_expiry_window check (expires_at > created_at and expires_at <= created_at + interval '31 days')
);

create index if not exists public_research_replays_owner_idx on public.public_research_replays(user_id, created_at desc);
create unique index if not exists public_research_replays_one_unrevoked_per_run_idx on public.public_research_replays(user_id, research_run_id) where revoked_at is null;
alter table public.public_research_replays enable row level security;
revoke all on public.public_research_replays from public, anon, authenticated;
grant select (public_id, payload, created_at, expires_at, revoked_at) on public.public_research_replays to anon, authenticated;
-- Writes go through the server API so its payload allowlist cannot be bypassed.
grant select, insert, update on public.public_research_replays to service_role;

create policy "Public research replays are readable by unguessable active link"
  on public.public_research_replays for select to anon
  using (revoked_at is null and expires_at > now());

create policy "Owners read their research replay shares"
  on public.public_research_replays for select to authenticated
  using ((select auth.uid()) = user_id);

-- No authenticated insert/update/delete grants or policies are defined.
