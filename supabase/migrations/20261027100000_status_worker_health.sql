create table if not exists public.tic_status_worker_heartbeats (
  worker_name text primary key check (worker_name in (
    'research_job_processing',
    'scheduled_paper_analysis',
    'webhook_delivery',
    'email_delivery'
  )),
  checked_at timestamptz not null default now(),
  healthy boolean not null,
  detail text not null
);

alter table public.tic_status_worker_heartbeats enable row level security;
revoke all on public.tic_status_worker_heartbeats from public, anon, authenticated;
grant select, insert, update on public.tic_status_worker_heartbeats to service_role;

create or replace function public.record_tic_status_worker_heartbeat(
  p_worker_name text,
  p_healthy boolean,
  p_detail text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_worker_name not in (
    'research_job_processing',
    'scheduled_paper_analysis',
    'webhook_delivery',
    'email_delivery'
  ) then
    raise exception 'Invalid Tidelight status worker';
  end if;

  insert into public.tic_status_worker_heartbeats(worker_name,checked_at,healthy,detail)
  values (p_worker_name,now(),p_healthy,left(coalesce(p_detail,''),160))
  on conflict (worker_name) do update
    set checked_at=excluded.checked_at, healthy=excluded.healthy, detail=excluded.detail;
end;
$$;
revoke all on function public.record_tic_status_worker_heartbeat(text,boolean,text) from public, anon, authenticated;
grant execute on function public.record_tic_status_worker_heartbeat(text,boolean,text) to service_role;

create or replace function public.get_tic_background_worker_status()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'name', monitor.name,
    'state', case
      when heartbeat.worker_name is null then 'degraded'
      when heartbeat.checked_at < now() - monitor.max_age then 'degraded'
      when not heartbeat.healthy then 'degraded'
      else 'operational'
    end,
    'detail', case
      when heartbeat.worker_name is null then 'No authenticated worker response has been recorded yet.'
      when heartbeat.checked_at < now() - monitor.max_age then 'The latest worker response is stale.'
      else heartbeat.detail
    end,
    'checkedAt', heartbeat.checked_at
  ) order by monitor.name), '[]'::jsonb)
  from (values
    ('Research job processing', 'research_job_processing', interval '5 minutes'),
    ('Scheduled paper analysis', 'scheduled_paper_analysis', interval '5 minutes'),
    ('Webhook delivery', 'webhook_delivery', interval '5 minutes'),
    ('Email delivery', 'email_delivery', interval '26 hours')
  ) as monitor(name, worker_name, max_age)
  left join public.tic_status_worker_heartbeats as heartbeat
    on heartbeat.worker_name = monitor.worker_name;
$$;
revoke all on function public.get_tic_background_worker_status() from public, anon, authenticated;
grant execute on function public.get_tic_background_worker_status() to service_role;
