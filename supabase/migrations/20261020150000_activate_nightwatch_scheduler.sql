-- Activate the minute poller for account-owned Nightwatch schedules.
-- The worker remains lease-protected and claims only due schedules, so this
-- does not create market analysis for accounts that have not opted in.
create extension if not exists pg_cron;

do $schedule$
declare
  prior_job record;
begin
  for prior_job in select jobid from cron.job where jobname = 'nightwatch-custom-schedules'
  loop
    perform cron.unschedule(prior_job.jobid);
  end loop;

  perform cron.schedule(
    'nightwatch-custom-schedules',
    '* * * * *',
    'select private.invoke_nightwatch_schedule_worker();'
  );
end;
$schedule$;
