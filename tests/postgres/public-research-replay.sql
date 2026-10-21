set role service_role;
insert into public.public_research_replays(user_id, research_run_id, payload) values
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '{"question":"active"}'),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', '{"question":"expired"}'),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', '{"question":"revoked"}');
update public.public_research_replays set
  created_at = now() - interval '40 days', expires_at = now() - interval '10 days'
where payload->>'question' = 'expired';
update public.public_research_replays set revoked_at = now()
where payload->>'question' = 'revoked';
reset role;

set role anon;
do $$ begin
  if (select count(*) from public.public_research_replays) <> 1 then
    raise exception 'anonymous readers must see only active, unexpired replay links';
  end if;
end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
do $$ begin
  if (select count(*) from public.public_research_replays) <> 3 then
    raise exception 'owners must be able to inspect their own active and historical links';
  end if;
  if has_table_privilege(current_user, 'public.public_research_replays', 'INSERT')
    or has_table_privilege(current_user, 'public.public_research_replays', 'UPDATE')
    or has_table_privilege(current_user, 'public.public_research_replays', 'DELETE') then
    raise exception 'authenticated browser sessions must not write replay rows directly';
  end if;
end $$;
reset role;
