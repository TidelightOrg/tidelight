-- Every completed Nightwatch analysis gets an explicit, idempotent observation event.
-- This is separate from signal/fill alerts so a safe HOLD is never silent.
alter table public.nightwatch_alerts drop constraint if exists nightwatch_alerts_kind_check;
alter table public.nightwatch_alerts add constraint nightwatch_alerts_kind_check
  check (kind in ('analysis','signal','fill','summary'));

alter table public.email_notification_preferences
  add column if not exists nightwatch_analysis boolean not null default false;

alter table public.email_delivery_queue drop constraint if exists email_delivery_queue_category_check;
alter table public.email_delivery_queue add constraint email_delivery_queue_category_check
  check (category in ('nightwatch_analysis','nightwatch_signal','nightwatch_fill','nightwatch_risk','nightwatch_research','nightwatch_summary','security'));
