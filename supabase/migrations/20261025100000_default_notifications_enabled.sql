-- New accounts receive every user-configurable Nightwatch notification by default.
-- Changing column defaults does not modify existing preference rows, so saved opt-outs stay intact.
alter table public.email_notification_preferences
  alter column nightwatch_analysis set default true,
  alter column nightwatch_signals set default true,
  alter column nightwatch_fills set default true,
  alter column nightwatch_risks set default true,
  alter column nightwatch_research set default true,
  alter column nightwatch_daily_summary set default true;

create or replace function public.initialize_email_notification_preferences()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.email_notification_preferences (
    user_id,
    nightwatch_analysis,
    nightwatch_signals,
    nightwatch_fills,
    nightwatch_risks,
    nightwatch_research,
    nightwatch_daily_summary
  ) values (new.id, true, true, true, true, true, true)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function public.initialize_email_notification_preferences() from public, anon, authenticated;

drop trigger if exists initialize_email_notification_preferences on auth.users;
create trigger initialize_email_notification_preferences
  after insert on auth.users
  for each row execute function public.initialize_email_notification_preferences();
