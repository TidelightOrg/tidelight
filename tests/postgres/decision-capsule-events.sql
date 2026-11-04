do $$ begin
  if not (select relrowsecurity from pg_class where oid = 'public.decision_capsule_events'::regclass) then
    raise exception 'capsule event storage must have row level security enabled';
  end if;
  if has_table_privilege('anon', 'public.decision_capsule_events', 'SELECT')
    or has_table_privilege('anon', 'public.decision_capsule_events', 'INSERT')
    or has_table_privilege('authenticated', 'public.decision_capsule_events', 'SELECT')
    or has_table_privilege('authenticated', 'public.decision_capsule_events', 'INSERT') then
    raise exception 'browser roles must not read or write capsule event storage';
  end if;
  if not has_table_privilege('service_role', 'public.decision_capsule_events', 'SELECT')
    or not has_table_privilege('service_role', 'public.decision_capsule_events', 'INSERT')
    or has_table_privilege('service_role', 'public.decision_capsule_events', 'UPDATE')
    or has_table_privilege('service_role', 'public.decision_capsule_events', 'DELETE') then
    raise exception 'service role must only read and append capsule events';
  end if;
  if has_function_privilege('anon', 'public.append_decision_capsule_event(uuid,uuid,integer,text,uuid,uuid,jsonb,text,text,timestamptz)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.append_decision_capsule_event(uuid,uuid,integer,text,uuid,uuid,jsonb,text,text,timestamptz)', 'EXECUTE')
    or not has_function_privilege('service_role', 'public.append_decision_capsule_event(uuid,uuid,integer,text,uuid,uuid,jsonb,text,text,timestamptz)', 'EXECUTE') then
    raise exception 'only the service role may append capsule events';
  end if;
end $$;

set role service_role;
insert into public.decision_capsules(id, user_id, research_run_id, original_snapshot, integrity_hash)
values (
  '50000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  null,
  '{"schemaVersion":1,"research":{"question":"event history fixture"}}',
  repeat('a', 64)
);
select public.append_decision_capsule_event(
  '50000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  1,
  'forecast',
  '40000000-0000-4000-8000-000000000001',
  null,
  '{"instrument":{"type":"us_equity","symbol":"NVDA"},"referencePrice":100,"referenceSourceUrl":"https://prices.example/nvda","referenceSourceTimestamp":"2026-11-04T00:00:00Z","referenceReportedBy":"user","direction":"up","thresholdPercent":5,"horizonAt":"2026-12-01T00:00:00Z"}',
  repeat('a', 64),
  repeat('b', 64),
  '2026-11-04T00:00:00Z'
);
select public.append_decision_capsule_event(
  '50000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000002',
  2,
  'outcome',
  '40000000-0000-4000-8000-000000000002',
  '30000000-0000-4000-8000-000000000001',
  '{"forecastEventId":"30000000-0000-4000-8000-000000000001","observedPrice":106,"reportedBy":"user"}',
  repeat('b', 64),
  repeat('c', 64),
  '2026-12-01T00:01:00Z'
);
do $$ begin
  begin
    perform public.append_decision_capsule_event(
      '50000000-0000-4000-8000-000000000001',
      '30000000-0000-4000-8000-000000000003',
      2,
      'forecast',
      '40000000-0000-4000-8000-000000000003',
      null,
      '{"instrument":{"type":"us_equity","symbol":"NVDA"}}',
      repeat('b', 64), repeat('d', 64), now()
    );
    raise exception 'stale event head must be rejected';
  exception when serialization_failure then null;
  end;
  begin
    perform public.append_decision_capsule_event(
      '50000000-0000-4000-8000-000000000001',
      '30000000-0000-4000-8000-000000000004',
      3,
      'outcome',
      '40000000-0000-4000-8000-000000000004',
      '30000000-0000-4000-8000-000000000001',
      '{"forecastEventId":"30000000-0000-4000-8000-000000000001"}',
      repeat('c', 64), repeat('e', 64), now()
    );
    raise exception 'one outcome per forecast must be enforced';
  exception when unique_violation then null;
  end;
  if (select count(*) from public.decision_capsule_events where capsule_id = '50000000-0000-4000-8000-000000000001') <> 2 then
    raise exception 'only correctly ordered events should persist';
  end if;
  begin
    update public.decision_capsule_events set payload = '{"rewritten":true}';
    raise exception 'event payload must not be rewritten';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

set role authenticated;
do $$ begin
  begin
    select * from public.decision_capsule_events;
    raise exception 'authenticated users must not read capsule events directly';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
