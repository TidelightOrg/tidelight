-- Server-rendered requests authenticate through Proxy-verified JWT claims.
-- Use the service client only after that verification and always carry the
-- verified user id through every owner-scoped operation.
create index research_monitor_revisions_user_id_idx
  on public.research_monitor_thesis_revisions(user_id);
create index research_monitor_observations_user_id_idx
  on public.research_monitor_observations(user_id);
create index research_monitor_observations_research_run_id_idx
  on public.research_monitor_observations(research_run_id);

create function public.create_research_monitor(p_ticker text, p_thesis text, p_user_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid := p_user_id; v_ticker text := upper(trim(p_ticker)); v_thesis text := trim(p_thesis); v_id uuid;
begin
  if auth.role() <> 'service_role' or v_user is null then raise exception 'verified server identity required' using errcode = '28000'; end if;
  if v_ticker not in ('NVDA','AMD','MSFT','AAPL','META','AMZN','GOOGL','TSLA','INTC','ASML','QCOM','MU','MSTR','CRCL','QQQ','ACN','RDDT','PLTR','HOOD','UNH','LLY','FUTU','APP','ORCL','BABA','MRVL','ARM','PEP','GME','MA','JD','IBM','CSCO','MCD','GE') then raise exception 'unsupported issuer ticker' using errcode = '22023'; end if;
  if char_length(v_thesis) < 12 or char_length(v_thesis) > 440 then raise exception 'thesis must be 12 to 440 characters' using errcode = '22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text, 0));
  if (select count(*) from public.research_monitors where user_id = v_user and status = 'active') >= 12 then raise exception 'active monitor limit reached' using errcode = '54000'; end if;
  insert into public.research_monitors(user_id, ticker, thesis) values (v_user, v_ticker, v_thesis) returning id into v_id;
  insert into public.research_monitor_thesis_revisions(monitor_id, user_id, revision, thesis) values (v_id, v_user, 1, v_thesis);
  return v_id;
end $$;

create function public.update_research_monitor_thesis(p_monitor_id uuid, p_thesis text, p_user_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_user uuid := p_user_id; v_revision integer; v_thesis text := trim(p_thesis);
begin
  if auth.role() <> 'service_role' or v_user is null then raise exception 'verified server identity required' using errcode = '28000'; end if;
  if char_length(v_thesis) < 12 or char_length(v_thesis) > 440 then raise exception 'thesis must be 12 to 440 characters' using errcode = '22023'; end if;
  update public.research_monitors set thesis = v_thesis, thesis_revision = thesis_revision + 1, updated_at = now()
    where id = p_monitor_id and user_id = v_user and status = 'active' returning thesis_revision into v_revision;
  if v_revision is null then raise exception 'active monitor unavailable' using errcode = 'P0002'; end if;
  insert into public.research_monitor_thesis_revisions(monitor_id, user_id, revision, thesis) values (p_monitor_id, v_user, v_revision, v_thesis);
  return v_revision;
end $$;

create function public.set_research_monitor_status(p_monitor_id uuid, p_status text, p_user_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_user uuid := p_user_id;
begin
  if auth.role() <> 'service_role' or v_user is null then raise exception 'verified server identity required' using errcode = '28000'; end if;
  if p_status not in ('active','archived') then raise exception 'invalid status' using errcode = '22023'; end if;
  if p_status = 'active' then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text, 0));
    if (select count(*) from public.research_monitors where user_id = v_user and status = 'active' and id <> p_monitor_id) >= 12 then raise exception 'active monitor limit reached' using errcode = '54000'; end if;
  end if;
  update public.research_monitors set status = p_status, updated_at = now()
    where id = p_monitor_id and user_id = v_user;
  return found;
end $$;

revoke all on function public.create_research_monitor(text, text, uuid), public.update_research_monitor_thesis(uuid, text, uuid), public.set_research_monitor_status(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.create_research_monitor(text, text, uuid), public.update_research_monitor_thesis(uuid, text, uuid), public.set_research_monitor_status(uuid, text, uuid) to service_role;
