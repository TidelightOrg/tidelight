-- Public judge research stores no guest prompt, result, or raw network identifier.
-- Only an HMAC fingerprint and rolling counters are retained for abuse controls.
create table public.guest_research_rate_limits (
  fingerprint text primary key check (fingerprint ~ '^[a-f0-9]{64}$'),
  hour_started_at timestamptz not null default now(),
  hourly_count integer not null default 0 check (hourly_count >= 0),
  day_started_at timestamptz not null default now(),
  daily_count integer not null default 0 check (daily_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.guest_research_rate_limits enable row level security;
create index guest_research_rate_limits_updated_idx on public.guest_research_rate_limits(updated_at);
revoke all on public.guest_research_rate_limits from public, anon, authenticated;
grant all on public.guest_research_rate_limits to service_role;

create function public.reserve_guest_research(p_fingerprint text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hour_count integer;
  v_day_count integer;
begin
  if p_fingerprint is null or p_fingerprint !~ '^[a-f0-9]{64}$' then return false; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_fingerprint, 941));
  insert into public.guest_research_rate_limits(fingerprint, hourly_count, daily_count)
    values (p_fingerprint, 1, 1)
  on conflict (fingerprint) do update set
    hourly_count = case when public.guest_research_rate_limits.hour_started_at < now() - interval '1 hour' then 1 else public.guest_research_rate_limits.hourly_count + 1 end,
    hour_started_at = case when public.guest_research_rate_limits.hour_started_at < now() - interval '1 hour' then now() else public.guest_research_rate_limits.hour_started_at end,
    daily_count = case when public.guest_research_rate_limits.day_started_at < now() - interval '1 day' then 1 else public.guest_research_rate_limits.daily_count + 1 end,
    day_started_at = case when public.guest_research_rate_limits.day_started_at < now() - interval '1 day' then now() else public.guest_research_rate_limits.day_started_at end,
    updated_at = now()
  returning hourly_count, daily_count into v_hour_count, v_day_count;
  delete from public.guest_research_rate_limits where updated_at < now() - interval '30 days';
  return v_hour_count <= 3 and v_day_count <= 10;
end;
$$;

revoke all on function public.reserve_guest_research(text) from public, anon, authenticated;
grant execute on function public.reserve_guest_research(text) to service_role;
