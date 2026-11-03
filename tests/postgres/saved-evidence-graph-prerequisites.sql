\set ON_ERROR_STOP on
create table public.research_sources (
  id uuid primary key,
  url text not null,
  title text not null,
  publisher text,
  content_hash text,
  excerpt text
);
create table public.research_evidence (
  id uuid primary key,
  claim text not null,
  supporting_quote text
);

-- The migration is intentionally NOT VALID so existing rows remain readable.
insert into public.research_sources(id, url, title, excerpt)
values ('20000000-0000-4000-8000-000000000001', 'https://sec.gov/legacy', 'Legacy', repeat('x', 7000));
