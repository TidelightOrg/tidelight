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

create or replace function nightwatch_private.nightwatch_close_position_with_quote(
  p_symbol text, p_reference_price numeric, p_reason text, p_quote_timestamp timestamptz
) returns jsonb
language plpgsql security definer set search_path = pg_catalog
as $$
declare
  v_user_id uuid := auth.uid();
  v_account public.nightwatch_accounts%rowtype;
  v_position public.nightwatch_positions%rowtype;
  v_checked_at timestamptz;
begin
  if v_user_id is null then raise exception 'Sign in to use Nightwatch.' using errcode = '42501'; end if;
  if p_symbol is null or p_symbol !~ '^[A-Z0-9]{2,24}USDT$' or p_reference_price is null or p_reference_price <= 0 then raise exception 'Invalid paper exit.' using errcode = '22023'; end if;
  select * into v_account from public.nightwatch_accounts where user_id = v_user_id for update;
  if not found then raise exception 'No Nightwatch paper account exists.' using errcode = 'P0002'; end if;
  select * into v_position from public.nightwatch_positions where account_id = v_account.id and symbol = p_symbol for update;
  if not found then raise exception 'No open paper position exists for this market.' using errcode = 'P0002'; end if;

  -- Check the provider time only after acquiring the same account and position locks as the ledger.
  v_checked_at := clock_timestamp();
  if p_quote_timestamp is null
    or p_quote_timestamp < v_checked_at - interval '120 seconds'
    or p_quote_timestamp > v_checked_at + interval '5 seconds' then
    raise exception 'A current timestamped Bitget fill is required for this paper exit.' using errcode = '22023';
  end if;

  -- The locks remain held while the legacy ledger calculates and writes its simulated fill.
  return nightwatch_private.nightwatch_close_position(p_symbol, p_reference_price, p_reason);
end;
$$;
revoke all on function nightwatch_private.nightwatch_close_position_with_quote(text,numeric,text,timestamptz) from public, anon, authenticated;
grant execute on function nightwatch_private.nightwatch_close_position_with_quote(text,numeric,text,timestamptz) to service_role;

create or replace function public.nightwatch_close_from_server(p_user_id uuid, p_symbol text, p_reference_price numeric, p_reason text, p_quote_timestamp timestamptz)
returns jsonb language plpgsql security definer set search_path = pg_catalog as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' or p_user_id is null then
    raise exception 'Nightwatch execution requires the protected server.' using errcode = '42501';
  end if;
  perform set_config('request.jwt.claim.sub', p_user_id::text, true);
  return nightwatch_private.nightwatch_close_position_with_quote(p_symbol, p_reference_price, p_reason, p_quote_timestamp);
end;
$$;
revoke all on function public.nightwatch_close_from_server(uuid,text,numeric,text,timestamptz) from public, anon, authenticated;
grant execute on function public.nightwatch_close_from_server(uuid,text,numeric,text,timestamptz) to service_role;
