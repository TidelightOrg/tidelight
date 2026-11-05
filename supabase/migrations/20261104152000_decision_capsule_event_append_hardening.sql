-- Keep the historical event migration immutable; apply append hardening forward.
revoke insert on public.decision_capsule_events from service_role;
grant select on public.decision_capsule_events to service_role;

alter function public.append_decision_capsule_event(uuid, uuid, integer, text, uuid, uuid, jsonb, text, text, timestamptz)
  security definer;
alter function public.append_decision_capsule_event(uuid, uuid, integer, text, uuid, uuid, jsonb, text, text, timestamptz)
  set search_path = '';
