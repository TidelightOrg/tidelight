do $$ begin
  if not (select relrowsecurity from pg_class where oid = 'public.decision_capsules'::regclass) then
    raise exception 'capsules must have row level security enabled';
  end if;
  if has_table_privilege('anon', 'public.decision_capsules', 'SELECT')
    or has_table_privilege('anon', 'public.decision_capsules', 'INSERT')
    or has_table_privilege('authenticated', 'public.decision_capsules', 'SELECT')
    or has_table_privilege('authenticated', 'public.decision_capsules', 'INSERT') then
    raise exception 'browser roles must not read or write private capsule storage';
  end if;
  if not has_table_privilege('service_role', 'public.decision_capsules', 'SELECT')
    or not has_table_privilege('service_role', 'public.decision_capsules', 'INSERT')
    or has_table_privilege('service_role', 'public.decision_capsules', 'UPDATE')
    or has_table_privilege('service_role', 'public.decision_capsules', 'DELETE') then
    raise exception 'service role must only read and append capsule records';
  end if;
end $$;

set role service_role;
insert into public.decision_capsules(user_id, research_run_id, original_snapshot, integrity_hash)
values ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '{"schemaVersion":1,"research":{"question":"test"}}', repeat('a', 64));
do $$ begin
  begin
    insert into public.decision_capsules(user_id, research_run_id, original_snapshot, integrity_hash)
    values ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '{"schemaVersion":1,"research":{"question":"duplicate"}}', repeat('c', 64));
    raise exception 'a second capsule for the same owner and run must be rejected';
  exception when unique_violation then null;
  end;
  begin
    insert into public.decision_capsules(user_id, research_run_id, original_snapshot, integrity_hash)
    values ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', '{"schemaVersion":1}', repeat('b', 64));
    raise exception 'cross-owner research linkage must be rejected';
  exception when foreign_key_violation then null;
  end;
  begin
    update public.decision_capsules set original_snapshot = '{"rewritten":true}';
    raise exception 'write-once capsule must not be updated by service role';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.decision_capsules;
    raise exception 'capsule must not be deleted by service role';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- The research run is a lifecycle link, not the capsule's owner. Deleting it
-- must preserve the immutable decision record and only clear the run reference.
delete from public.research_runs where id = '20000000-0000-4000-8000-000000000001';
do $$ begin
  if not exists (
    select 1 from public.decision_capsules
    where user_id = '10000000-0000-4000-8000-000000000001'
      and research_run_id is null
      and original_snapshot = '{"schemaVersion":1,"research":{"question":"test"}}'
  ) then
    raise exception 'deleting a research run must preserve its capsule and clear only the run link';
  end if;
end $$;

set role authenticated;
do $$ begin
  begin
    select * from public.decision_capsules;
    raise exception 'authenticated users must not read capsule storage directly';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
