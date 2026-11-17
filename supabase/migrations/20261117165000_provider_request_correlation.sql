-- Link provider call diagnostics to the originating server-generated request
-- ID without retaining a user ID, research text, provider payload, or run ID.
alter table public.research_provider_health_events
  add column if not exists request_id uuid;

create index if not exists research_provider_health_events_request_id_idx
  on public.research_provider_health_events (request_id)
  where request_id is not null;
