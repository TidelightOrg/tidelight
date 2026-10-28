create or replace function private.invoke_tic_email_delivery_worker()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  worker_url text;
  worker_secret text;
  request_id bigint;
begin
  select decrypted_secret into worker_url
  from vault.decrypted_secrets
  where name = 'tic_research_worker_url';

  select decrypted_secret into worker_secret
  from vault.decrypted_secrets
  where name = 'tic_research_worker_secret';

  if worker_url is null or worker_secret is null
    or worker_url !~ '^https://[^/]+/api/cron/tic-research/?$' then
    raise exception 'Tidelight email worker configuration is unavailable';
  end if;

  worker_url := regexp_replace(worker_url, '/api/cron/tic-research/?$', '/api/cron/email-delivery');

  select net.http_get(
    url := worker_url,
    headers := jsonb_build_object('Authorization', 'Bearer ' || worker_secret),
    timeout_milliseconds := 15000
  ) into request_id;

  return request_id;
end;
$$;

revoke all on function private.invoke_tic_email_delivery_worker() from public, anon, authenticated, service_role;

do $$
declare
  prior record;
begin
  if not exists (select 1 from vault.decrypted_secrets where name = 'tic_research_worker_url')
    or not exists (select 1 from vault.decrypted_secrets where name = 'tic_research_worker_secret') then
    raise exception 'Configure the existing Tidelight research worker URL and bearer in Supabase Vault before scheduling';
  end if;

  for prior in select jobid from cron.job where jobname = 'tic-email-delivery-worker' loop
    perform cron.unschedule(prior.jobid);
  end loop;

  perform cron.schedule(
    'tic-email-delivery-worker',
    '*/15 * * * *',
    'select private.invoke_tic_email_delivery_worker();'
  );
end;
$$;
