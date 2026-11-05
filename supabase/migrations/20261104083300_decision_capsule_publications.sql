create table if not exists public.decision_capsule_publications (
  id uuid primary key default gen_random_uuid(),
  capsule_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  schema_version integer not null default 1 check (schema_version = 1),
  public_snapshot jsonb not null check (
    jsonb_typeof(public_snapshot) = 'object'
    and pg_column_size(public_snapshot) <= 262144
  ),
  integrity_hash text not null check (integrity_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint decision_capsule_publications_owner_fkey
    foreign key (capsule_id, user_id)
    references public.decision_capsules(id, user_id)
    on delete cascade,
  constraint decision_capsule_publications_revoked_after_creation
    check (revoked_at is null or revoked_at >= created_at)
);

create unique index if not exists decision_capsule_publications_one_active_idx
  on public.decision_capsule_publications(capsule_id)
  where revoked_at is null;
create index if not exists decision_capsule_publications_owner_created_idx
  on public.decision_capsule_publications(user_id, created_at desc);

alter table public.decision_capsule_publications enable row level security;
revoke all on public.decision_capsule_publications from public, anon, authenticated, service_role;
grant select on public.decision_capsule_publications to service_role;
grant update (revoked_at) on public.decision_capsule_publications to service_role;

create or replace function public.prevent_capsule_publication_reactivation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if old.revoked_at is not null or new.revoked_at is null then
    raise exception using errcode = '23514', message = 'capsule_publication_revocation_is_final';
  end if;
  new.revoked_at := greatest(clock_timestamp(), old.created_at);
  return new;
end;
$$;
revoke all on function public.prevent_capsule_publication_reactivation() from public, anon, authenticated, service_role;
create trigger decision_capsule_publication_revocation_is_final
  before update on public.decision_capsule_publications
  for each row execute function public.prevent_capsule_publication_reactivation();

comment on table public.decision_capsule_publications is
  'Revocable bearer links to explicitly selected, redacted public projections of private Decision Capsules. The public projection hash covers disclosed content only.';
comment on column public.decision_capsule_publications.token_hash is
  'SHA-256 of a random 256-bit bearer token; the reusable raw token is returned only at publication time.';
comment on column public.decision_capsule_publications.public_snapshot is
  'Allowlisted public projection. It excludes account identifiers and private storage metadata; publication requires owner confirmation.';

create or replace function public.publish_decision_capsule_publication(
  p_capsule_id uuid,
  p_user_id uuid,
  p_expected_history_sequence integer,
  p_expected_history_hash text,
  p_token_hash text,
  p_public_snapshot jsonb,
  p_integrity_hash text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_capsule_user_id uuid;
  v_capsule_hash text;
  v_head_sequence integer;
  v_head_hash text;
  v_publication public.decision_capsule_publications%rowtype;
begin
  if p_capsule_id is null or p_user_id is null or p_expected_history_sequence is null or p_expected_history_sequence not between 0 and 500
    or p_expected_history_hash is null
    or p_expected_history_hash !~ '^[a-f0-9]{64}$'
    or p_token_hash is null
    or p_token_hash !~ '^[a-f0-9]{64}$'
    or p_integrity_hash is null
    or p_integrity_hash !~ '^[a-f0-9]{64}$'
    or p_public_snapshot is null
    or jsonb_typeof(p_public_snapshot) <> 'object'
    or pg_column_size(p_public_snapshot) > 262144 then
    raise exception using errcode = '22023', message = 'invalid_capsule_publication';
  end if;

  -- This is the same transaction lock used by append_decision_capsule_event.
  -- It protects both the history comparison and the publication insert.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_capsule_id::text, 0));

  select capsule.user_id, capsule.integrity_hash
    into v_capsule_user_id, v_capsule_hash
    from public.decision_capsules as capsule
    where capsule.id = p_capsule_id;
  if not found or v_capsule_user_id is distinct from p_user_id then
    raise exception using errcode = 'P0002', message = 'capsule_not_found';
  end if;

  select event.sequence, event.integrity_hash
    into v_head_sequence, v_head_hash
    from public.decision_capsule_events as event
    where event.capsule_id = p_capsule_id
    order by event.sequence desc
    limit 1;
  if coalesce(v_head_sequence, 0) is distinct from p_expected_history_sequence
    or coalesce(v_head_hash, v_capsule_hash) is distinct from p_expected_history_hash then
    raise exception using errcode = '40001', message = 'capsule_event_head_changed';
  end if;

  if exists (
    select 1 from public.decision_capsule_publications as publication
    where publication.capsule_id = p_capsule_id and publication.revoked_at is null
  ) then
    raise exception using errcode = '23505', message = 'active_capsule_publication_exists';
  end if;

  insert into public.decision_capsule_publications(
    capsule_id, user_id, token_hash, public_snapshot, integrity_hash
  ) values (
    p_capsule_id, p_user_id, p_token_hash, p_public_snapshot, p_integrity_hash
  ) returning * into v_publication;

  return pg_catalog.jsonb_build_object('created_at', v_publication.created_at);
end;
$$;
revoke all on function public.publish_decision_capsule_publication(uuid, uuid, integer, text, text, jsonb, text) from public, anon, authenticated, service_role;
grant execute on function public.publish_decision_capsule_publication(uuid, uuid, integer, text, text, jsonb, text) to service_role;

alter table public.tic_oauth_rate_limits drop constraint if exists tic_oauth_rate_limits_endpoint_check;
alter table public.tic_oauth_rate_limits add constraint tic_oauth_rate_limits_endpoint_check
  check (endpoint in ('register','authorize','token','revoke','public_capsule'));

create or replace function public.reserve_tic_oauth_rate_limit(p_subject_hash text,p_endpoint text,p_max_requests integer,p_window_seconds integer)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare current_window timestamptz; current_count integer;
begin
  if p_subject_hash !~ '^[0-9a-f]{64}$' or p_endpoint not in ('register','authorize','token','revoke','public_capsule')
     or p_max_requests not between 1 and 1000 or p_window_seconds not between 1 and 86400 then
    raise exception 'invalid OAuth rate limit parameters';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_subject_hash || ':' || p_endpoint,0));
  delete from public.tic_oauth_rate_limits where window_started_at < now() - interval '1 day';
  select window_started_at,request_count into current_window,current_count
    from public.tic_oauth_rate_limits where subject_hash=p_subject_hash and endpoint=p_endpoint for update;
  if not found then
    insert into public.tic_oauth_rate_limits(subject_hash,endpoint,window_started_at,request_count)
    values(p_subject_hash,p_endpoint,now(),1);
  elsif current_window <= now() - make_interval(secs => p_window_seconds) then
    update public.tic_oauth_rate_limits set window_started_at=now(),request_count=1
      where subject_hash=p_subject_hash and endpoint=p_endpoint;
  elsif current_count >= p_max_requests then
    return false;
  else
    update public.tic_oauth_rate_limits set request_count=request_count+1
      where subject_hash=p_subject_hash and endpoint=p_endpoint;
  end if;
  return true;
end $$;
