set role service_role;
insert into public.public_nightwatch_replays(user_id, order_id, payload) values
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '{"market":{"symbol":"RNVDUSDT","side":"buy","quantity":1},"decision":{"signal":"buy"}}'),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', '{"market":{"symbol":"RAAPLUSDT"}}');
update public.public_nightwatch_replays set created_at = now() - interval '31 days', expires_at = now() - interval '1 second'
where payload->'market'->>'symbol' = 'RAAPLUSDT';
reset role;

set role anon;
do $$ begin
  if (select count(*) from public.public_nightwatch_replays) <> 1 then
    raise exception 'public readers must see only active, unexpired Nightwatch replays';
  end if;
  if has_column_privilege(current_user, 'public.public_nightwatch_replays', 'user_id', 'select')
    or has_column_privilege(current_user, 'public.public_nightwatch_replays', 'order_id', 'select') then
    raise exception 'public readers must not access owner or ledger identifiers';
  end if;
  if has_table_privilege(current_user, 'public.public_nightwatch_replays', 'INSERT')
    or has_table_privilege(current_user, 'public.public_nightwatch_replays', 'UPDATE')
    or has_table_privilege(current_user, 'public.public_nightwatch_replays', 'DELETE') then
    raise exception 'public readers must not mutate replay rows';
  end if;
end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
do $$ begin
  if (select count(*) from public.public_nightwatch_replays) <> 1 then
    raise exception 'signed-in readers must follow the same public expiry and revocation rules';
  end if;
  if has_table_privilege(current_user, 'public.public_nightwatch_replays', 'INSERT')
    or has_table_privilege(current_user, 'public.public_nightwatch_replays', 'UPDATE')
    or has_table_privilege(current_user, 'public.public_nightwatch_replays', 'DELETE') then
    raise exception 'browser sessions must not mutate replay rows';
  end if;
end $$;
reset role;

set role service_role;
update public.public_nightwatch_replays set revoked_at = now()
where payload->'market'->>'symbol' = 'RNVDUSDT';
reset role;
set role anon;
do $$ begin
  if (select count(*) from public.public_nightwatch_replays) <> 0 then
    raise exception 'revoked replay links must disappear from public reads';
  end if;
end $$;
reset role;
