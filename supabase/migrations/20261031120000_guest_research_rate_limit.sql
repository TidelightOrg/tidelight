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
  v_hour_started_at timestamptz;
  v_hourly_count integer;
  v_day_started_at timestamptz;
  v_daily_count integer;
  v_next_hourly_count integer;
  v_next_daily_count integer;
begin
  if p_fingerprint is null or p_fingerprint !~ '^[a-f0-9]{64}$' then return false; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_fingerprint, 941));
  delete from public.guest_research_rate_limits where updated_at < now() - interval '30 days';
  select hour_started_at, hourly_count, day_started_at, daily_count
    into v_hour_started_at, v_hourly_count, v_day_started_at, v_daily_count
    from public.guest_research_rate_limits where fingerprint = p_fingerprint for update;
  if not found then
    insert into public.guest_research_rate_limits(fingerprint, hourly_count, daily_count)
      values (p_fingerprint, 1, 1);
    return true;
  end if;

  if v_hour_started_at < now() - interval '1 hour' then
    v_next_hourly_count := 1;
    v_hour_started_at := now();
  else
    v_next_hourly_count := v_hourly_count + 1;
  end if;
  if v_day_started_at < now() - interval '1 day' then
    v_next_daily_count := 1;
    v_day_started_at := now();
  else
    v_next_daily_count := v_daily_count + 1;
  end if;

  -- Denied reservations do not consume either window's capacity.
  if v_next_hourly_count > 3 or v_next_daily_count > 10 then return false; end if;
  update public.guest_research_rate_limits set
    hour_started_at = v_hour_started_at,
    hourly_count = v_next_hourly_count,
    day_started_at = v_day_started_at,
    daily_count = v_next_daily_count,
    updated_at = now()
    where fingerprint = p_fingerprint;
  return true;
end;
$$;

revoke all on function public.reserve_guest_research(text) from public, anon, authenticated;
grant execute on function public.reserve_guest_research(text) to service_role;
