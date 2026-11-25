-- The owner-scoped two-argument functions were superseded by
-- research_monitor_proxy_auth, which moves writes behind verified server
-- actions. Keep the legacy overloads for rollback compatibility, but remove
-- their direct PostgREST access for client roles.
revoke all on function public.create_research_monitor(text, text)
  from public, anon, authenticated;
revoke all on function public.update_research_monitor_thesis(uuid, text)
  from public, anon, authenticated;
revoke all on function public.set_research_monitor_status(uuid, text)
  from public, anon, authenticated;
