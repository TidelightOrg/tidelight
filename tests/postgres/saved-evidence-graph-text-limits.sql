\set ON_ERROR_STOP on
begin;
do $$
begin
  if not exists (select 1 from public.research_sources where id = '20000000-0000-4000-8000-000000000001' and char_length(excerpt) = 7000) then
    raise exception 'The NOT VALID migration must leave legacy rows readable';
  end if;
end $$;

insert into public.research_sources(id, url, title, publisher, content_hash, excerpt)
values ('20000000-0000-4000-8000-000000000002', 'https://sec.gov/current', 'Current', repeat('p',120), repeat('a',128), repeat('e',6000));
insert into public.research_evidence(id, claim, supporting_quote)
values ('30000000-0000-4000-8000-000000000001', repeat('c',2000), repeat('q',600));

do $$
begin
  begin
    insert into public.research_sources(id, url, title, content_hash) values ('20000000-0000-4000-8000-000000000003', 'https://sec.gov/oversized-hash', 'Bad hash', repeat('h',129));
    raise exception 'Oversized content hash unexpectedly passed';
  exception when check_violation then null; end;
  begin
    insert into public.research_sources(id, url, title, excerpt) values ('20000000-0000-4000-8000-000000000004', 'https://sec.gov/oversized-excerpt', 'Bad excerpt', repeat('e',6001));
    raise exception 'Oversized source excerpt unexpectedly passed';
  exception when check_violation then null; end;
  begin
    insert into public.research_evidence(id, claim) values ('30000000-0000-4000-8000-000000000002', repeat('c',2001));
    raise exception 'Oversized claim unexpectedly passed';
  exception when check_violation then null; end;
  begin
    insert into public.research_evidence(id, claim, supporting_quote) values ('30000000-0000-4000-8000-000000000003', 'A bounded claim', repeat('q',601));
    raise exception 'Oversized quote unexpectedly passed';
  exception when check_violation then null; end;
end $$;
rollback;
