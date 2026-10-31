begin;
do $$
declare
  v_fingerprint text := repeat('a', 64);
  v_daily_fingerprint text := repeat('b', 64);
  v_allowed boolean;
  i integer;
begin
  if not public.reserve_guest_research(v_fingerprint) then raise exception 'first guest request should pass'; end if;
  if not public.reserve_guest_research(v_fingerprint) then raise exception 'second guest request should pass'; end if;
  if not public.reserve_guest_research(v_fingerprint) then raise exception 'third guest request should pass'; end if;
  if public.reserve_guest_research(v_fingerprint) then raise exception 'fourth hourly request should be denied'; end if;
  for i in 1..10 loop
    v_allowed := public.reserve_guest_research(v_daily_fingerprint);
    if not v_allowed then raise exception 'daily request % should pass', i; end if;
  end loop;
  if public.reserve_guest_research(v_daily_fingerprint) then raise exception 'eleventh daily request should be denied'; end if;
  if public.reserve_guest_research('not-a-fingerprint') then raise exception 'invalid fingerprint must be denied'; end if;
end;
$$;
rollback;
