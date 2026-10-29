-- Operational provider telemetry is deliberately detached from private research runs.
create table if not exists public.research_provider_health_events (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  provider text not null check (provider in ('qwen', 'gemini')),
  model text not null check (char_length(model) between 1 and 80),
  attempt smallint not null check (attempt between 1 and 2),
  outcome text not null check (outcome in ('success', 'http_error', 'invalid_response', 'timeout', 'network_error')),
  duration_ms integer not null check (duration_ms between 0 and 120000),
  http_status smallint check (http_status between 100 and 599)
);

create index if not exists research_provider_health_events_occurred_at_idx
  on public.research_provider_health_events (occurred_at desc);

alter table public.research_provider_health_events enable row level security;
revoke all on table public.research_provider_health_events from public, anon, authenticated;
grant select, insert on table public.research_provider_health_events to service_role;
grant usage, select on sequence public.research_provider_health_events_id_seq to service_role;

create or replace function public.get_research_provider_health(p_days integer)
returns table (
  provider text,
  model text,
  outcome text,
  attempt_count bigint,
  average_duration_ms numeric,
  p95_duration_ms integer,
  latest_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select e.provider, e.model, e.outcome, count(*)::bigint,
    round(avg(e.duration_ms)::numeric, 1),
    percentile_cont(0.95) within group (order by e.duration_ms)::integer,
    max(e.occurred_at)
  from public.research_provider_health_events e
  where e.occurred_at >= now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 180)))
  group by e.provider, e.model, e.outcome
  order by e.provider, e.model, e.outcome;
$$;

revoke all on function public.get_research_provider_health(integer) from public, anon, authenticated;
grant execute on function public.get_research_provider_health(integer) to service_role;

create or replace function private.prune_research_provider_health_events()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count bigint;
begin
  delete from public.research_provider_health_events
  where occurred_at < now() - interval '180 days';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function private.prune_research_provider_health_events() from public, anon, authenticated, service_role;

do $$
declare
  prior record;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    for prior in select jobid from cron.job where jobname = 'research-provider-health-retention' loop
      perform cron.unschedule(prior.jobid);
    end loop;
    perform cron.schedule('research-provider-health-retention', '23 3 * * *', 'select private.prune_research_provider_health_events();');
  end if;
end;
$$;

