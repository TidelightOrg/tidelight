-- Provider-health events have a 180-day retention contract. Fail deployment rather than
-- silently accepting unbounded storage when pg_cron is unavailable.
create extension if not exists pg_cron;

do $$
declare
  prior record;
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise exception 'pg_cron is required to enforce provider health event retention';
  end if;

  for prior in
    select jobid from cron.job where jobname = 'research-provider-health-retention'
  loop
    perform cron.unschedule(prior.jobid);
  end loop;

  perform cron.schedule(
    'research-provider-health-retention',
    '23 3 * * *',
    'select private.prune_research_provider_health_events();'
  );
end;
$$;
