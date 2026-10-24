drop policy if exists "Active strategy replays are readable by signed-in link visitors"
  on public.public_strategy_replays;

drop policy if exists "Owners read their strategy replay shares"
  on public.public_strategy_replays;

create policy "Owners and signed-in visitors read strategy replay links"
  on public.public_strategy_replays for select to authenticated
  using ((revoked_at is null and expires_at > now()) or (select auth.uid()) = user_id);
