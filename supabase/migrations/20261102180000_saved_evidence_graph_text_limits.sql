-- Bound authenticated text writes that are later expanded into saved evidence graphs.
-- NOT VALID avoids rejecting deployments with legacy rows; PostgreSQL enforces these
-- checks for new and updated rows while the API rejects over-limit legacy records.
alter table public.research_sources
  add constraint research_sources_graph_text_limits_check
  check (
    char_length(url) <= 4096 and octet_length(url) <= 16384
    and char_length(title) <= 300 and octet_length(title) <= 1200
    and (publisher is null or (char_length(publisher) <= 120 and octet_length(publisher) <= 480))
    and (content_hash is null or (char_length(content_hash) <= 128 and octet_length(content_hash) <= 512))
    and (excerpt is null or (char_length(excerpt) <= 6000 and octet_length(excerpt) <= 24000))
  ) not valid;

alter table public.research_evidence
  add constraint research_evidence_graph_text_limits_check
  check (
    char_length(claim) <= 2000 and octet_length(claim) <= 8000
    and (supporting_quote is null or (char_length(supporting_quote) <= 600 and octet_length(supporting_quote) <= 2400))
  ) not valid;
