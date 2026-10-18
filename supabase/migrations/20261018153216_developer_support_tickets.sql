create table if not exists public.developer_support_tickets (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references auth.users(id) on delete cascade,
  requester_email text not null check (length(requester_email) between 3 and 320),
  ecosystem text not null check (ecosystem in ('tidelight', 'intelligence', 'packages')),
  subject text not null check (length(subject) between 3 and 140),
  status text not null default 'open' check (status in ('open', 'awaiting_user', 'resolved', 'cancelled')),
  admin_notification_state text not null default 'pending' check (admin_notification_state in ('pending', 'sent', 'partial', 'failed')),
  admin_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now()
);

create table if not exists public.developer_support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.developer_support_tickets(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  author_kind text not null check (author_kind in ('requester', 'admin', 'system')),
  body text not null check (length(body) between 1 and 3000),
  created_at timestamptz not null default now()
);

create index if not exists developer_support_ticket_activity_idx on public.developer_support_tickets(status, last_activity_at desc);
create index if not exists developer_support_ticket_requester_idx on public.developer_support_tickets(requester_user_id, last_activity_at desc);
create index if not exists developer_support_message_thread_idx on public.developer_support_messages(ticket_id, created_at asc);

alter table public.developer_support_tickets enable row level security;
alter table public.developer_support_messages enable row level security;
revoke all on public.developer_support_tickets, public.developer_support_messages from public, anon, authenticated;
grant all on public.developer_support_tickets, public.developer_support_messages to service_role;
