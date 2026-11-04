do $$ begin
  if not (select relrowsecurity from pg_class where oid = 'public.decision_capsule_publications'::regclass) then
    raise exception 'public capsule publications must have row level security enabled';
  end if;
  if has_table_privilege('anon', 'public.decision_capsule_publications', 'SELECT')
    or has_table_privilege('anon', 'public.decision_capsule_publications', 'INSERT')
    or has_table_privilege('authenticated', 'public.decision_capsule_publications', 'SELECT')
    or has_table_privilege('authenticated', 'public.decision_capsule_publications', 'INSERT') then
    raise exception 'browser roles must not access publication storage directly';
  end if;
  if not has_table_privilege('service_role', 'public.decision_capsule_publications', 'SELECT')
    or has_table_privilege('service_role', 'public.decision_capsule_publications', 'INSERT')
    or not has_column_privilege('service_role', 'public.decision_capsule_publications', 'revoked_at', 'UPDATE')
    or has_column_privilege('service_role', 'public.decision_capsule_publications', 'public_snapshot', 'UPDATE')
    or has_table_privilege('service_role', 'public.decision_capsule_publications', 'DELETE') then
    raise exception 'service role must only read and revoke directly; inserts use the atomic publisher';
  end if;
  if has_function_privilege('anon', 'public.publish_decision_capsule_publication(uuid,uuid,integer,text,text,jsonb,text)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.publish_decision_capsule_publication(uuid,uuid,integer,text,text,jsonb,text)', 'EXECUTE')
    or not has_function_privilege('service_role', 'public.publish_decision_capsule_publication(uuid,uuid,integer,text,text,jsonb,text)', 'EXECUTE') then
    raise exception 'only the service role may publish through the atomic history check';
  end if;
end $$;

do $$ begin
  if not public.reserve_tic_oauth_rate_limit(repeat('e', 64), 'public_capsule', 1, 60)
    or public.reserve_tic_oauth_rate_limit(repeat('e', 64), 'public_capsule', 1, 60) then
    raise exception 'public capsule reads must use the shared atomic rate limiter';
  end if;
end $$;

set role service_role;
do $$ begin
  begin
    perform public.publish_decision_capsule_publication(
      '50000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 1,
      repeat('b', 64), repeat('a', 64), '{"schemaVersion":1,"research":{"question":"stale"}}', repeat('b', 64)
    );
    raise exception 'publication must reject a stale preview history head';
  exception when serialization_failure then null;
  end;
  perform public.publish_decision_capsule_publication(
    '50000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 2,
    repeat('c', 64), repeat('a', 64), '{"schemaVersion":1,"research":{"question":"shared"}}', repeat('b', 64)
  );
  begin
    perform public.publish_decision_capsule_publication(
      '50000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 2,
      repeat('c', 64), repeat('c', 64), '{"schemaVersion":1}', repeat('d', 64)
    );
    raise exception 'a capsule must have only one active publication';
  exception when unique_violation then null;
  end;
  update public.decision_capsule_publications set revoked_at = now()
    where capsule_id = '50000000-0000-4000-8000-000000000001';
  perform public.publish_decision_capsule_publication(
    '50000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 2,
    repeat('c', 64), repeat('d', 64), '{"schemaVersion":1}', repeat('e', 64)
  );
  begin
    update public.decision_capsule_publications set revoked_at = null
      where capsule_id = '50000000-0000-4000-8000-000000000001' and token_hash = repeat('a', 64);
    raise exception 'a revoked publication must not be reactivated';
  exception when check_violation then null;
  end;
  if (select count(*) from public.decision_capsule_publications where capsule_id = '50000000-0000-4000-8000-000000000001' and revoked_at is null) <> 1 then
    raise exception 'revocation must permit one replacement publication';
  end if;
end $$;
reset role;

set role authenticated;
do $$ begin
  begin
    select * from public.decision_capsule_publications;
    raise exception 'authenticated users must not read publication storage directly';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
