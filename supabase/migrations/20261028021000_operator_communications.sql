create table if not exists public.tic_status_maintenance (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 140),
  subtitle text not null check (char_length(subtitle) between 1 and 240),
  message text not null check (char_length(message) between 1 and 12000),
  affected_services text[] not null default '{}',
  status text not null default 'scheduled' check (status in ('scheduled', 'ongoing', 'completed')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tic_status_maintenance_time_order check (ends_at is null or ends_at >= starts_at)
);

create index if not exists tic_status_maintenance_status_time_idx
  on public.tic_status_maintenance (status, starts_at desc);

alter table public.tic_status_maintenance enable row level security;
revoke all on public.tic_status_maintenance from public, anon, authenticated;
grant select, insert, update, delete on public.tic_status_maintenance to service_role;

create table if not exists public.tic_blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 100),
  title text not null check (char_length(title) between 1 and 180),
  subtitle text not null check (char_length(subtitle) between 1 and 320),
  category text not null default 'PRODUCT NOTES' check (char_length(category) between 1 and 80),
  body text not null check (char_length(body) between 1 and 50000),
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tic_blog_posts_publish_time check ((status = 'draft' and published_at is null) or status = 'published')
);

create index if not exists tic_blog_posts_published_idx
  on public.tic_blog_posts (published_at desc)
  where status = 'published';

alter table public.tic_blog_posts enable row level security;
revoke all on public.tic_blog_posts from public, anon, authenticated;
grant select, insert, update, delete on public.tic_blog_posts to service_role;

insert into public.tic_status_maintenance
  (title, subtitle, message, affected_services, status, starts_at)
values
  (
    'Maintenance on fixing known issues',
    'Service will be fully restored soon',
    'We are actively working on known issues affecting Tidelight background services. Updates will be posted here as our team applies fixes. We will confirm here once all services are fully restored.',
    array['Email delivery', 'Scheduled paper analysis'],
    'ongoing',
    now()
  );
