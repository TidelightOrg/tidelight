\set ON_ERROR_STOP on
begin;
insert into auth.users values ('00000000-0000-4000-8000-000000000001'), ('00000000-0000-4000-8000-000000000002');
do $$
begin
  if has_function_privilege('anon', 'public.nightwatch_tick_from_server(uuid,text,bigint,numeric,numeric,numeric,text,jsonb)', 'EXECUTE') or has_function_privilege('authenticated', 'public.nightwatch_tick_from_server(uuid,text,bigint,numeric,numeric,numeric,text,jsonb)', 'EXECUTE') or not has_function_privilege('service_role', 'public.nightwatch_tick_from_server(uuid,text,bigint,numeric,numeric,numeric,text,jsonb)', 'EXECUTE') then raise exception 'Tick service boundary incorrect'; end if;
  if has_function_privilege('anon', 'public.nightwatch_close_from_server(uuid,text,numeric,text)', 'EXECUTE') or has_function_privilege('authenticated', 'public.nightwatch_close_from_server(uuid,text,numeric,text)', 'EXECUTE') or not has_function_privilege('service_role', 'public.nightwatch_close_from_server(uuid,text,numeric,text)', 'EXECUTE') then raise exception 'Exit service boundary incorrect'; end if;
end $$;
select set_config('request.jwt.claim.role', 'service_role', true);
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
set local role service_role;
do $$
declare r jsonb; owner_id uuid := '00000000-0000-4000-8000-000000000001'; candle_ms bigint := floor(extract(epoch from now() - interval '1 minute')*1000);
begin
  r := public.nightwatch_tick_from_server(owner_id, 'RAAPLUSDT', candle_ms, 100, 101, 99, 'buy', '{}');
  if r->>'outcome' <> 'executed' then raise exception 'Expected paper buy: %', r; end if;
  r := public.nightwatch_tick_from_server(owner_id, 'RAAPLUSDT', candle_ms, 100, 101, 99, 'buy', '{}');
  if r->>'idempotent' <> 'true' then raise exception 'Retry must remain idempotent'; end if;
  r := public.nightwatch_close_from_server(owner_id, 'RAAPLUSDT', 100, 'Test exit');
  if r->>'outcome' <> 'executed' then raise exception 'Expected paper exit: %', r; end if;
  begin perform public.nightwatch_tick_from_server(null, 'RAAPLUSDT', candle_ms, 100, 101, 99, 'hold', '{}'); raise exception 'Null owner accepted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
  if (select count(*) from public.nightwatch_orders where user_id = '00000000-0000-4000-8000-000000000001') <> 2 then raise exception 'Orders must belong to explicit verified owner'; end if;
  if exists(select 1 from public.nightwatch_accounts where user_id = '00000000-0000-4000-8000-000000000002') then raise exception 'Original JWT subject must not receive owner orders'; end if;
end $$;
rollback;
