begin;
do $$
declare
  v_fingerprint text := repeat('a', 64);
  v_daily_fingerprint text := repeat('b', 64);
  v_allowed boolean;
  i integer;
begin
  if has_function_privilege('anon', 'public.reserve_guest_research(text)', 'execute') then raise exception 'anon must not execute the reservation RPC'; end if;
  if has_table_privilege('anon', 'public.guest_research_rate_limits', 'select') then raise exception 'anon must not read network fingerprints'; end if;
  if not public.reserve_guest_research(v_fingerprint) then raise exception 'first guest request should pass'; end if;
  if not public.reserve_guest_research(v_fingerprint) then raise exception 'second guest request should pass'; end if;
  if not public.reserve_guest_research(v_fingerprint) then raise exception 'third guest request should pass'; end if;
  for i in 1..7 loop
    if public.reserve_guest_research(v_fingerprint) then raise exception 'hourly retry % should be denied', i; end if;
  end loop;
  update public.guest_research_rate_limits set hour_started_at = now() - interval '2 hours' where fingerprint = v_fingerprint;
  if not public.reserve_guest_research(v_fingerprint) then raise exception 'hourly-denied retries must not consume daily capacity'; end if;
  for i in 1..10 loop
    if i > 1 and (i - 1) % 3 = 0 then
      update public.guest_research_rate_limits set hour_started_at = now() - interval '2 hours' where fingerprint = v_daily_fingerprint;
    end if;
    v_allowed := public.reserve_guest_research(v_daily_fingerprint);
    if not v_allowed then raise exception 'daily request % should pass', i; end if;
  end loop;
  if public.reserve_guest_research(v_daily_fingerprint) then raise exception 'eleventh daily request should be denied'; end if;
  if public.reserve_guest_research('not-a-fingerprint') then raise exception 'invalid fingerprint must be denied'; end if;
end;
$$;
rollback;
