-- Private, manual research monitors. Observations and thesis revisions are append-only.
alter table public.research_runs add constraint research_runs_id_user_unique unique (id, user_id);

create table public.research_monitors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ticker text not null check (ticker ~ '^[A-Z]{1,6}$'),
  thesis text not null check (char_length(thesis) between 12 and 800),
  thesis_revision integer not null default 1 check (thesis_revision > 0),
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);
create table public.research_monitor_thesis_revisions (
  id uuid primary key default gen_random_uuid(),
  monitor_id uuid not null, user_id uuid not null references auth.users(id) on delete cascade,
  revision integer not null check (revision > 0),
  thesis text not null check (char_length(thesis) between 12 and 800),
  created_at timestamptz not null default now(),
  unique (monitor_id, revision),
  foreign key (monitor_id, user_id) references public.research_monitors(id, user_id) on delete cascade
);
create table public.research_monitor_observations (
  id uuid primary key default gen_random_uuid(),
  monitor_id uuid not null, user_id uuid not null references auth.users(id) on delete cascade,
  research_run_id uuid not null, thesis_revision integer not null check (thesis_revision > 0),
  observed_at timestamptz not null default now(),
  unique (monitor_id, research_run_id),
  foreign key (monitor_id, user_id) references public.research_monitors(id, user_id) on delete cascade,
  foreign key (research_run_id, user_id) references public.research_runs(id, user_id) on delete cascade
);
create index research_monitors_user_status_idx on public.research_monitors(user_id, status, updated_at desc);
create index research_monitor_revisions_monitor_idx on public.research_monitor_thesis_revisions(monitor_id, revision desc);
create index research_monitor_observations_monitor_idx on public.research_monitor_observations(monitor_id, observed_at desc);
alter table public.research_monitors enable row level security;
alter table public.research_monitor_thesis_revisions enable row level security;
alter table public.research_monitor_observations enable row level security;
create policy "Owners read research monitors" on public.research_monitors for select to authenticated using (user_id = (select auth.uid()));
create policy "Owners read monitor thesis revisions" on public.research_monitor_thesis_revisions for select to authenticated using (user_id = (select auth.uid()));
create policy "Owners read monitor observations" on public.research_monitor_observations for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.research_monitors, public.research_monitor_thesis_revisions, public.research_monitor_observations from anon, public, authenticated;
grant select on public.research_monitors, public.research_monitor_thesis_revisions, public.research_monitor_observations to authenticated;

create or replace function public.create_research_monitor(p_ticker text, p_thesis text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_ticker text := upper(trim(p_ticker)); v_thesis text := trim(p_thesis); v_id uuid;
begin
  if v_user is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if v_ticker !~ '^[A-Z]{1,6}$' then raise exception 'unsupported ticker format' using errcode = '22023'; end if;
  if char_length(v_thesis) < 12 or char_length(v_thesis) > 800 then raise exception 'thesis must be 12 to 800 characters' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 0));
  if (select count(*) from public.research_monitors where user_id = v_user and status = 'active') >= 12 then raise exception 'active monitor limit reached' using errcode = '54000'; end if;
  insert into public.research_monitors(user_id,ticker,thesis) values(v_user,v_ticker,v_thesis) returning id into v_id;
  insert into public.research_monitor_thesis_revisions(monitor_id,user_id,revision,thesis) values(v_id,v_user,1,v_thesis);
  return v_id;
end $$;

create or replace function public.update_research_monitor_thesis(p_monitor_id uuid, p_thesis text)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_revision integer; v_thesis text := trim(p_thesis);
begin
  if v_user is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if char_length(v_thesis) < 12 or char_length(v_thesis) > 800 then raise exception 'thesis must be 12 to 800 characters' using errcode = '22023'; end if;
  update public.research_monitors set thesis=v_thesis, thesis_revision=thesis_revision+1, updated_at=now()
    where id=p_monitor_id and user_id=v_user and status='active' returning thesis_revision into v_revision;
  if v_revision is null then raise exception 'active monitor unavailable' using errcode = 'P0002'; end if;
  insert into public.research_monitor_thesis_revisions(monitor_id,user_id,revision,thesis) values(p_monitor_id,v_user,v_revision,v_thesis);
  return v_revision;
end $$;

create or replace function public.set_research_monitor_status(p_monitor_id uuid, p_status text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if p_status not in ('active','archived') then raise exception 'invalid status' using errcode = '22023'; end if;
  update public.research_monitors set status=p_status, updated_at=now() where id=p_monitor_id and user_id=v_user;
  return found;
end $$;

revoke all on function public.create_research_monitor(text,text), public.update_research_monitor_thesis(uuid,text), public.set_research_monitor_status(uuid,text) from public, anon;
grant execute on function public.create_research_monitor(text,text), public.update_research_monitor_thesis(uuid,text), public.set_research_monitor_status(uuid,text) to authenticated;
