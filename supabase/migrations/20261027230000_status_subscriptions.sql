create table if not exists public.tic_status_subscriptions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token_hash text not null unique,
  components text[] not null default '{}',
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(email)
);
create table if not exists public.tic_status_subscription_deliveries (
  subscription_id uuid not null references public.tic_status_subscriptions(id) on delete cascade,
  incident_id bigint not null references public.tic_status_incidents(id) on delete cascade,
  event_kind text not null check(event_kind in ('new','resolved')),
  sent_at timestamptz not null default now(),
  primary key(subscription_id,incident_id,event_kind)
);
alter table public.tic_status_subscriptions enable row level security;
alter table public.tic_status_subscription_deliveries enable row level security;
revoke all on public.tic_status_subscriptions,public.tic_status_subscription_deliveries from public,anon,authenticated;
grant select,insert,update,delete on public.tic_status_subscriptions,public.tic_status_subscription_deliveries to service_role;
