alter table public.research_evidence
  add column quote_match_status text not null default 'not_recorded',
  add column claim_support_status text not null default 'not_independently_verified',
  add column passage_start_codepoint integer,
  add column passage_end_codepoint integer,
  add constraint research_evidence_quote_match_status_check
    check (quote_match_status in ('not_recorded', 'matched_to_captured_text')),
  add constraint research_evidence_claim_support_status_check
    check (claim_support_status = 'not_independently_verified'),
  add constraint research_evidence_passage_span_check
    check (
      (quote_match_status = 'not_recorded'
        and passage_start_codepoint is null
        and passage_end_codepoint is null)
      or
      (quote_match_status = 'matched_to_captured_text'
        and passage_start_codepoint is not null
        and passage_start_codepoint >= 0
        and passage_end_codepoint is not null
        and passage_end_codepoint > passage_start_codepoint)
    );

comment on column public.research_evidence.passage_start_codepoint is
  'Zero-based inclusive Unicode codepoint offset into the captured source excerpt.';
comment on column public.research_evidence.passage_end_codepoint is
  'Exclusive Unicode codepoint offset into the captured source excerpt.';
