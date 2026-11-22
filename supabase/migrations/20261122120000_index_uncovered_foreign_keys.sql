create index if not exists decision_capsules_research_run_owner_fk_idx
  on public.decision_capsules (research_run_id, user_id);

create index if not exists public_nightwatch_replays_order_fk_idx
  on public.public_nightwatch_replays (order_id);

create index if not exists public_research_replays_run_fk_idx
  on public.public_research_replays (research_run_id);

create index if not exists research_monitor_observations_monitor_owner_fk_idx
  on public.research_monitor_observations (monitor_id, user_id);

create index if not exists research_monitor_observations_run_owner_fk_idx
  on public.research_monitor_observations (research_run_id, user_id);

create index if not exists research_monitor_thesis_revisions_monitor_owner_fk_idx
  on public.research_monitor_thesis_revisions (monitor_id, user_id);
