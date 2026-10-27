create table if not exists public.tic_status_snapshots (
  id bigint generated always as identity primary key,
  sampled_at timestamptz not null default now(),
  sample_slot timestamptz not null default date_bin('15 minutes', now(), '2000-01-01 00:00:00+00'::timestamptz),
  overall_state text not null check (overall_state in ('operational','degraded')),
  components jsonb not null check (jsonb_typeof(components) = 'object'),
  unique (sample_slot)
);

create table if not exists public.tic_status_incidents (
  id bigint generated always as identity primary key,
  component text not null,
  started_at timestamptz not null default now(),
  resolved_at timestamptz,
  state text not null check (state in ('investigating','resolved')),
  latest_detail text not null default '',
  check ((state = 'investigating' and resolved_at is null) or (state = 'resolved' and resolved_at is not null))
);
create index if not exists tic_status_incidents_timeline_idx on public.tic_status_incidents(started_at desc);

alter table public.tic_status_snapshots enable row level security;
alter table public.tic_status_incidents enable row level security;
revoke all on public.tic_status_snapshots, public.tic_status_incidents from anon, authenticated, public;
grant select, insert, delete on public.tic_status_snapshots to service_role;
grant select, insert, update, delete on public.tic_status_incidents to service_role;

create or replace function public.record_tic_status_snapshot(p_overall text, p_components jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_slot timestamptz := date_bin('15 minutes', now(), '2000-01-01 00:00:00+00'::timestamptz);
  v_key text;
  v_state text;
  v_incident bigint;
  v_created integer := 0;
  v_resolved integer := 0;
begin
  if p_overall not in ('operational','degraded') or jsonb_typeof(p_components) <> 'object' then
    raise exception 'Invalid Tidelight status snapshot';
  end if;
  perform pg_advisory_xact_lock(hashtext('tic_status_history_quarter_hour'));
  insert into public.tic_status_snapshots(sample_slot, overall_state, components)
  values (v_slot, p_overall, p_components)
  on conflict (sample_slot) do update set sampled_at = now(), overall_state = excluded.overall_state, components = excluded.components;

  for v_key, v_state in select key, value #>> '{}' from jsonb_each(p_components) loop
    if v_state not in ('operational','degraded') then continue; end if;
    select id into v_incident from public.tic_status_incidents where component = v_key and state = 'investigating' order by started_at desc limit 1 for update;
    if v_state = 'degraded' then
      if v_incident is null then
        insert into public.tic_status_incidents(component,state,latest_detail) values(v_key,'investigating','Observed degraded during scheduled check');
        v_created := v_created + 1;
      else
        update public.tic_status_incidents set latest_detail = 'Still degraded at latest scheduled check' where id = v_incident;
      end if;
    elsif v_incident is not null then
      update public.tic_status_incidents set state='resolved', resolved_at=now(), latest_detail='Operational at latest scheduled check' where id=v_incident;
      v_resolved := v_resolved + 1;
    end if;
    v_incident := null;
  end loop;
  delete from public.tic_status_snapshots where sampled_at < now() - interval '90 days';
  delete from public.tic_status_incidents where coalesce(resolved_at,started_at) < now() - interval '90 days';
  return jsonb_build_object('sampleSlot',v_slot,'createdIncidents',v_created,'resolvedIncidents',v_resolved);
end;
$$;
revoke all on function public.record_tic_status_snapshot(text,jsonb) from public, anon, authenticated;
grant execute on function public.record_tic_status_snapshot(text,jsonb) to service_role;

create or replace function private.invoke_tic_status_worker()
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  worker_url text;
  worker_secret text;
  request_id bigint;
begin
  select decrypted_secret into worker_url from vault.decrypted_secrets where name = 'tic_research_worker_url';
  select decrypted_secret into worker_secret from vault.decrypted_secrets where name = 'tic_research_worker_secret';
  if worker_url is null or worker_secret is null or worker_url !~ '^https://[^/]+/api/cron/tic-research/?$' then
    raise exception 'Tidelight research worker configuration is unavailable';
  end if;
  worker_url := regexp_replace(worker_url,'/api/cron/tic-research/?$','/api/cron/status-history');
  select net.http_post(url := worker_url, headers := jsonb_build_object('Authorization','Bearer '||worker_secret), body := '{}'::jsonb, timeout_milliseconds := 15000) into request_id;
  return request_id;
end;
$$;
revoke all on function private.invoke_tic_status_worker() from public, anon, authenticated, service_role;

do $$
declare prior record;
begin
  if not exists (select 1 from vault.decrypted_secrets where name='tic_research_worker_url')
    or not exists (select 1 from vault.decrypted_secrets where name='tic_research_worker_secret') then
    raise exception 'Configure the existing Tidelight research worker URL and bearer in Supabase Vault before scheduling';
  end if;
  for prior in select jobid from cron.job where jobname='tic-status-history' loop perform cron.unschedule(prior.jobid); end loop;
  perform cron.schedule('tic-status-history','*/15 * * * *','select private.invoke_tic_status_worker();');
end;
$$;
