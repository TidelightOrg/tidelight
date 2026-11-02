-- Additive first stage: deploy these service-only entry points before switching
-- server routes. Existing authenticated RPC grants are revoked in a later release.
create or replace function public.nightwatch_tick_from_server(
  p_user_id uuid, p_symbol text, p_as_of_ms bigint, p_reference_price numeric,
  p_fast_sma numeric, p_slow_sma numeric, p_signal text, p_snapshot jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path = pg_catalog as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' or p_user_id is null then
    raise exception 'Nightwatch execution requires the protected server.' using errcode = '42501';
  end if;
  perform set_config('request.jwt.claim.sub', p_user_id::text, true);
  return nightwatch_private.nightwatch_tick(p_symbol, p_as_of_ms, p_reference_price, p_fast_sma, p_slow_sma, p_signal, p_snapshot);
end;
$$;
revoke all on function public.nightwatch_tick_from_server(uuid,text,bigint,numeric,numeric,numeric,text,jsonb) from public, anon, authenticated;
grant execute on function public.nightwatch_tick_from_server(uuid,text,bigint,numeric,numeric,numeric,text,jsonb) to service_role;

create or replace function public.nightwatch_close_from_server(p_user_id uuid, p_symbol text, p_reference_price numeric, p_reason text default 'Manual paper exit')
returns jsonb language plpgsql security definer set search_path = pg_catalog as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' or p_user_id is null then
    raise exception 'Nightwatch execution requires the protected server.' using errcode = '42501';
  end if;
  perform set_config('request.jwt.claim.sub', p_user_id::text, true);
  return nightwatch_private.nightwatch_close_position(p_symbol, p_reference_price, p_reason);
end;
$$;
revoke all on function public.nightwatch_close_from_server(uuid,text,numeric,text) from public, anon, authenticated;
grant execute on function public.nightwatch_close_from_server(uuid,text,numeric,text) to service_role;
