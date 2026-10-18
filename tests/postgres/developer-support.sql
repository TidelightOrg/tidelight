insert into auth.users (id) values ('00000000-0000-0000-0000-000000000001');

insert into public.developer_support_tickets (requester_user_id, requester_email, ecosystem, subject)
values ('00000000-0000-0000-0000-000000000001', 'person@example.com', 'packages', 'Install question');

insert into public.developer_support_messages (ticket_id, author_user_id, author_kind, body)
select id, requester_user_id, 'requester', 'The install command failed.'
from public.developer_support_tickets
where subject = 'Install question';

do $$
begin
  if not (select relrowsecurity from pg_class where oid = 'public.developer_support_tickets'::regclass) then
    raise exception 'Ticket RLS must be enabled';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.developer_support_messages'::regclass) then
    raise exception 'Message RLS must be enabled';
  end if;
  if to_regclass('public.developer_support_messages_author_idx') is null then
    raise exception 'Message author foreign key needs an index';
  end if;
  if has_table_privilege('anon', 'public.developer_support_tickets', 'select')
    or has_table_privilege('authenticated', 'public.developer_support_tickets', 'select') then
    raise exception 'Client roles must not read ticket rows directly';
  end if;
  if not has_table_privilege('service_role', 'public.developer_support_tickets', 'select')
    or not has_table_privilege('service_role', 'public.developer_support_tickets', 'insert')
    or not has_table_privilege('service_role', 'public.developer_support_tickets', 'update')
    or not has_table_privilege('service_role', 'public.developer_support_tickets', 'delete') then
    raise exception 'The service role needs ticket access';
  end if;
  begin
    insert into public.developer_support_tickets (requester_user_id, requester_email, ecosystem, subject)
    values ('00000000-0000-0000-0000-000000000001', 'person@example.com', 'unknown', 'Invalid system');
    raise exception 'Unsupported ecosystems must be rejected';
  exception when check_violation then
    null;
  end;
end $$;
