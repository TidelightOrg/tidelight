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
  delivery_status text not null default 'pending' check(delivery_status in ('pending','sent')),
  claimed_at timestamptz not null default now(),
  sent_at timestamptz,
  primary key(subscription_id,incident_id,event_kind)
);
alter table public.tic_status_subscriptions enable row level security;
alter table public.tic_status_subscription_deliveries enable row level security;
revoke all on public.tic_status_subscriptions,public.tic_status_subscription_deliveries from public,anon,authenticated;
grant select,insert,update,delete on public.tic_status_subscriptions,public.tic_status_subscription_deliveries to service_role;

create table if not exists public.tic_status_subscription_pending (
  email text primary key,
  token_hash text not null unique,
  components text[] not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.tic_status_subscription_pending enable row level security;
revoke all on public.tic_status_subscription_pending from public,anon,authenticated;
grant select,insert,update,delete on public.tic_status_subscription_pending to service_role;

create table if not exists public.tic_status_subscription_limits (
  key_hash text primary key,
  last_allowed_at timestamptz not null default now()
);
alter table public.tic_status_subscription_limits enable row level security;
revoke all on public.tic_status_subscription_limits from public,anon,authenticated;
grant select,insert,update,delete on public.tic_status_subscription_limits to service_role;

create or replace function public.consume_tic_status_subscription_limit(p_key_hash text, p_cooldown_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  changed integer;
begin
  insert into public.tic_status_subscription_limits(key_hash, last_allowed_at)
  values (p_key_hash, now())
  on conflict (key_hash) do update
    set last_allowed_at = now()
    where public.tic_status_subscription_limits.last_allowed_at <= now() - make_interval(secs => greatest(p_cooldown_seconds, 1));
  get diagnostics changed = row_count;
  return changed = 1;
end;
$$;
revoke all on function public.consume_tic_status_subscription_limit(text, integer) from public,anon,authenticated;
grant execute on function public.consume_tic_status_subscription_limit(text, integer) to service_role;

alter table public.tic_status_subscription_deliveries add column if not exists delivery_status text not null default 'sent';
alter table public.tic_status_subscription_deliveries add column if not exists claimed_at timestamptz not null default now();
alter table public.tic_status_subscription_deliveries alter column sent_at drop not null;
