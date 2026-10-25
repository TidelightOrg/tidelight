-- Enable all user-configurable Nightwatch email notifications for accounts
-- that existed before the default-on rollout. Users can turn any category off
-- afterward through notification settings.
update public.email_notification_preferences
set nightwatch_analysis = true,
    nightwatch_signals = true,
    nightwatch_fills = true,
    nightwatch_risks = true,
    nightwatch_research = true,
    nightwatch_daily_summary = true;
