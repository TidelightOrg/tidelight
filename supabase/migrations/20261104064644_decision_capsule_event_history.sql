create table if not exists public.decision_capsule_events (
  id uuid primary key,
  capsule_id uuid not null,
  user_id uuid not null,
  sequence integer not null check (sequence between 1 and 500),
  event_type text not null check (event_type in ('forecast', 'outcome')),
  idempotency_key uuid not null,
  forecast_event_id uuid,
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and pg_column_size(payload) <= 16384),
  previous_hash text not null check (previous_hash ~ '^[a-f0-9]{64}$'),
  integrity_hash text not null check (integrity_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null,
  constraint decision_capsule_events_owner_fkey
    foreign key (capsule_id, user_id)
    references public.decision_capsules(id, user_id)
    on delete cascade,
  constraint decision_capsule_events_capsule_id_unique unique (capsule_id, id),
  constraint decision_capsule_events_sequence_unique unique (capsule_id, sequence),
  constraint decision_capsule_events_idempotency_unique unique (capsule_id, idempotency_key),
  constraint decision_capsule_events_forecast_reference_check check (
    (event_type = 'forecast' and forecast_event_id is null)
    or (event_type = 'outcome' and forecast_event_id is not null)
  ),
  constraint decision_capsule_events_forecast_fkey
    foreign key (capsule_id, forecast_event_id)
    references public.decision_capsule_events(capsule_id, id)
    on delete cascade
);

create unique index if not exists decision_capsule_events_one_outcome_per_forecast_idx
  on public.decision_capsule_events(capsule_id, forecast_event_id)
  where event_type = 'outcome';
create index if not exists decision_capsule_events_owner_sequence_idx
  on public.decision_capsule_events(user_id, capsule_id, sequence);

alter table public.decision_capsule_events enable row level security;
revoke all on public.decision_capsule_events from public, anon, authenticated, service_role;
-- All appends must use the advisory-locked function below. Direct inserts
-- would bypass the serialized chain-head check used by publication as well.
grant select on public.decision_capsule_events to service_role;

comment on table public.decision_capsule_events is
  'Append-only forecast and outcome events chained to a private Decision Capsule. Hashes prove record integrity, not truth or independent verification.';
comment on column public.decision_capsule_events.payload is
  'Strict application-validated event data. Outcome source and observed value are user-reported unless separately verified.';
comment on column public.decision_capsule_events.previous_hash is
  'Original capsule hash for the first event; otherwise the preceding event hash.';

create or replace function public.append_decision_capsule_event(
  p_capsule_id uuid,
  p_event_id uuid,
  p_sequence integer,
  p_event_type text,
  p_idempotency_key uuid,
  p_forecast_event_id uuid,
  p_payload jsonb,
  p_previous_hash text,
  p_integrity_hash text,
  p_created_at timestamptz
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_capsule_hash text;
  v_head_sequence integer;
  v_head_hash text;
  v_forecast_type text;
  v_event public.decision_capsule_events%rowtype;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_capsule_id::text, 0));

  select c.user_id, c.integrity_hash
    into v_user_id, v_capsule_hash
    from public.decision_capsules as c
    where c.id = p_capsule_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'capsule_not_found';
  end if;

  select e.sequence, e.integrity_hash
    into v_head_sequence, v_head_hash
    from public.decision_capsule_events as e
    where e.capsule_id = p_capsule_id
    order by e.sequence desc
    limit 1;
  if p_sequence is distinct from coalesce(v_head_sequence, 0) + 1
    or p_previous_hash is distinct from coalesce(v_head_hash, v_capsule_hash) then
    raise exception using errcode = '40001', message = 'capsule_event_head_changed';
  end if;

  if p_event_type = 'outcome' then
    select e.event_type into v_forecast_type
      from public.decision_capsule_events as e
      where e.capsule_id = p_capsule_id and e.id = p_forecast_event_id;
    if v_forecast_type is distinct from 'forecast' then
      raise exception using errcode = '23503', message = 'capsule_forecast_not_found';
    end if;
  end if;

  insert into public.decision_capsule_events (
    id, capsule_id, user_id, sequence, event_type, idempotency_key,
    forecast_event_id, payload, previous_hash, integrity_hash, created_at
  ) values (
    p_event_id, p_capsule_id, v_user_id, p_sequence, p_event_type, p_idempotency_key,
    p_forecast_event_id, p_payload, p_previous_hash, p_integrity_hash, p_created_at
  ) returning * into v_event;

  return pg_catalog.to_jsonb(v_event);
end;
$$;

revoke all on function public.append_decision_capsule_event(uuid, uuid, integer, text, uuid, uuid, jsonb, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.append_decision_capsule_event(uuid, uuid, integer, text, uuid, uuid, jsonb, text, text, timestamptz) to service_role;
