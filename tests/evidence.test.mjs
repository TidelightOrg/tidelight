import test from "node:test";
import assert from "node:assert/strict";
import { validateBrief } from "../lib/evidence.ts";

const sourceOne = {
  url: "https://www.sec.gov/news/example",
  excerpt: "🌊  The company said it would invest $4 billion in a new research facility over the next five years.",
};
const sourceTwo = {
  url: "https://investor.example.com/release",
  excerpt: "Management expects the new facility to begin operations in 2028, subject to regulatory approvals.",
};
const base = {
  summary: "The planned facility may expand long-term research capacity.",
  upside: "The investment could improve future research capacity.",
  downside: "The opening date depends on approvals.",
  catalysts: ["Regulatory approvals"],
};

test("matches meaningful quotes across whitespace and attributes them to the right source", () => {
  const result = validateBrief({ ...base, claims: [
    { claim: "The company announced a multiyear investment.", quote: "The company said it would invest $4 billion\nin a new research facility over the next five years.", source_url: sourceOne.url, stance: "supports", confidence: 0.92 },
    { claim: "Operations are expected to begin in 2028.", quote: "Management expects the new facility to begin operations in 2028, subject to regulatory approvals.", source_url: sourceTwo.url, stance: "context", confidence: 0.81 },
  ] }, [sourceOne, sourceTwo]);

  assert.ok(result);
  assert.equal(result.answer_status, "source_matched_claims");
  assert.equal(result.claims.length, 2);
  assert.equal(result.claims[0].sourceUrl, sourceOne.url);
  assert.equal(result.claims[1].sourceUrl, sourceTwo.url);
  assert.equal(result.claims[0].quote_match_status, "matched_to_captured_text");
  assert.equal(result.claims[0].claim_support_status, "not_independently_verified");
  assert.deepEqual(result.claims[0].passage_span, { start_codepoint: 3, end_codepoint: 99 });
  assert.equal(result.citation_coverage, 100);
});

test("preserves Greek contextual casing and Unicode passage offsets", () => {
  const source = { url: "https://issuer.example.com/release", excerpt: "🌊 The company ΑΤΛΑΣ reported higher revenue this year." };
  const quote = "The company ΑΤΛΑΣ reported higher revenue this year.";
  const result = validateBrief({ ...base, claims: [
    { claim: "Revenue increased year over year.", quote, source_url: source.url, stance: "supports", confidence: 0.8 },
  ] }, [source]);

  assert.ok(result);
  assert.equal(result.claims[0].quote, quote);
  const start = Array.from(source.excerpt.slice(0, source.excerpt.indexOf("The"))).length;
  assert.deepEqual(result.claims[0].passage_span, { start_codepoint: start, end_codepoint: start + Array.from(quote).length });
});

test("rejects short, altered, misattributed, and ungrounded quotes", () => {
  const result = validateBrief({ ...base, claims: [
    { claim: "A very short fragment is not adequate evidence.", quote: "invest $4 billion", stance: "supports" },
    { claim: "An altered quote is not accepted.", quote: "The company plans to invest $4 billion in a new facility.", stance: "supports" },
    { claim: "A quote cannot be pinned to the wrong source.", quote: "The company said it would invest $4 billion in a new research facility over the next five years.", source_url: sourceTwo.url, stance: "supports" },
  ] }, [sourceOne, sourceTwo]);
  assert.equal(result?.answer_status, "insufficient_evidence");
  assert.deepEqual(result?.claims, []);
  assert.equal(result?.citation_coverage, 0);
});

test("represents empty source evidence as an explicit unknown without model-written claims", () => {
  const result = validateBrief({ ...base,
    summary: "The company is certain to double profits.",
    upside: "A fabricated outcome.",
    downside: "A fabricated risk.",
    claims: [],
  }, [sourceOne]);

  assert.equal(result?.answer_status, "insufficient_evidence");
  assert.equal(result?.summary, "The supplied passages did not yield a source-matched claim that answers this question.");
  assert.equal(result?.upside, "Unknown from the supplied evidence.");
  assert.equal(result?.downside, "Unknown from the supplied evidence.");
  assert.deepEqual(result?.claims, []);
  assert.equal(result?.citation_coverage, 0);
});

test("reports coverage against all model claims when unsupported claims are dropped", () => {
  const result = validateBrief({ ...base, claims: [
    { claim: "The company announced a multiyear investment.", quote: "The company said it would invest $4 billion in a new research facility over the next five years.", source_url: sourceOne.url, stance: "supports", confidence: 1.4 },
    { claim: "The unsupported inference is excluded from the saved brief.", quote: "The facility will double profits next year, according to executives.", stance: "supports" },
  ] }, [sourceOne]);

  assert.ok(result);
  assert.equal(result.answer_status, "source_matched_claims");
  assert.equal(result.claims.length, 1);
  assert.equal(result.citation_coverage, 50);
  assert.equal(result.claims[0].confidence, 1);
});
