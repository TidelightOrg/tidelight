create extension if not exists pgcrypto;
create schema if not exists auth;
create table auth.users (id uuid primary key);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
grant usage on schema public, auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

create table public.nightwatch_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  run_id uuid not null,
  symbol text not null,
  side text not null,
  quantity numeric not null,
  reference_price numeric not null,
  simulated_fill_price numeric not null,
  notional numeric not null,
  fee numeric not null,
  realized_pnl numeric,
  created_at timestamptz not null default now()
);

insert into auth.users(id) values ('10000000-0000-4000-8000-000000000001');
insert into public.nightwatch_orders(id, user_id, run_id, symbol, side, quantity, reference_price, simulated_fill_price, notional, fee) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'RNVDUSDT', 'buy', 1, 100, 100.05, 100.05, 0.1),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', 'RAAPLUSDT', 'buy', 2, 200, 200.1, 400.2, 0.4);
