create extension if not exists pgcrypto;
create schema if not exists auth;
create table auth.users (id uuid primary key);
create table public.research_runs (id uuid primary key, user_id uuid not null references auth.users(id), status text not null);
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

insert into auth.users(id) values
  ('10000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000002');
insert into public.research_runs(id, user_id, status) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'complete'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'complete'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'complete');

grant select on public.research_runs to anon, authenticated, service_role;
alter table public.research_runs enable row level security;
create policy "fixture runs visible to owners" on public.research_runs for select to authenticated using (user_id = (select auth.uid()));
create policy "fixture runs readable for policy validation" on public.research_runs for select to service_role using (true);
