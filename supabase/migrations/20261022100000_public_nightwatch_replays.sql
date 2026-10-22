create table if not exists public.public_nightwatch_replays (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null unique default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid not null references public.nightwatch_orders(id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and pg_column_size(payload) <= 32768),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  revoked_at timestamptz,
  constraint public_nightwatch_replays_expiry_window check (expires_at > created_at and expires_at <= created_at + interval '31 days')
);

create index if not exists public_nightwatch_replays_owner_idx on public.public_nightwatch_replays(user_id, created_at desc);
create index if not exists public_nightwatch_replays_public_idx on public.public_nightwatch_replays(created_at desc) where revoked_at is null;
create unique index if not exists public_nightwatch_replays_one_active_per_order_idx on public.public_nightwatch_replays(user_id, order_id) where revoked_at is null;
alter table public.public_nightwatch_replays enable row level security;
revoke all on public.public_nightwatch_replays from public, anon, authenticated;
grant select (public_id, payload, created_at, expires_at, revoked_at) on public.public_nightwatch_replays to anon, authenticated;
grant select, insert, update on public.public_nightwatch_replays to service_role;

create policy "Active Nightwatch replays are readable by public link"
  on public.public_nightwatch_replays for select to anon
  using (revoked_at is null and expires_at > now());

create policy "Active Nightwatch replays are readable by public link for signed-in readers"
  on public.public_nightwatch_replays for select to authenticated
  using (revoked_at is null and expires_at > now());

-- Replay writes and revocation are server-mediated; authenticated clients cannot mutate the public payload.
