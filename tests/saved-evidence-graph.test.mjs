import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { findQuotePassageSpan } from "../lib/evidence.ts";

const graphHooks = registerHooks({ resolve(specifier, _context, nextResolve) {
  if (specifier === "@/lib/evidence") return { url: new URL("../lib/evidence.ts", import.meta.url).href, shortCircuit: true };
  return nextResolve(specifier);
} });
const { buildSavedEvidenceGraph, savedGraphInputsWithinLimits, SAVED_GRAPH_INPUT_LIMITS } = await import("../lib/saved-evidence-graph.ts");
graphHooks.deregister();

const asOf = "2026-10-31T20:00:00.000Z";
const run = { id: "10000000-0000-4000-8000-000000000001", question: "Review NVDA filing", created_at: "2026-10-31T19:00:00.000Z", completed_at: asOf, summary: { exposure: [{ ticker: "NVDA", issuer: "NVIDIA Corporation", realityPair: "RNVDAUSDT" }], sources: [{ url: "https://example.com/future", publication_date: "2026-11-01" }, { url: "https://example.com/day", publication_date: "2026-10-31" }] } };
const sources = [
  { id: "20000000-0000-4000-8000-000000000001", url: "https://sec.gov/filing/1", title: "SEC filing", publisher: "SEC", published_at: "2026-10-30T12:00:00.000Z", retrieved_at: "2026-10-31T19:10:00.000Z", source_type: "web", excerpt: "Revenue grew 8 percent.", content_hash: "a".repeat(64) },
  { id: "20000000-0000-4000-8000-000000000002", url: "https://example.com/late", title: "Captured later", publisher: "Example", published_at: "2026-10-30T12:00:00.000Z", retrieved_at: "2026-11-01T00:00:00.000Z", source_type: "web", excerpt: "Future capture.", content_hash: null },
  { id: "20000000-0000-4000-8000-000000000003", url: "https://example.com/future", title: "Future date", publisher: "Example", published_at: null, retrieved_at: "2026-10-31T19:20:00.000Z", source_type: "web", excerpt: "Future publication.", content_hash: null },
  { id: "20000000-0000-4000-8000-000000000004", url: "https://example.com/day", title: "Date only today", publisher: "Example", published_at: null, retrieved_at: "2026-10-31T19:20:00.000Z", source_type: "web", excerpt: "Unknown publish time.", content_hash: null },
];
const evidence = [
  { id: "30000000-0000-4000-8000-000000000001", source_id: sources[0].id, claim: "Revenue grew 8 percent.", supporting_quote: "Revenue grew 8 percent.", stance: "supports", confidence: 0.8, created_at: "2026-10-31T19:12:00.000Z", quote_match_status: "matched_to_captured_text", claim_support_status: "not_independently_verified", passage_start_codepoint: 0, passage_end_codepoint: Array.from("Revenue grew 8 percent.").length },
  { id: "30000000-0000-4000-8000-000000000002", source_id: sources[0].id, claim: "Forward guidance remains uncertain.", supporting_quote: null, stance: "contradicts", confidence: 0.5, created_at: "2026-10-31T19:13:00.000Z", quote_match_status: "not_recorded", claim_support_status: "not_independently_verified", passage_start_codepoint: null, passage_end_codepoint: null },
  { id: "30000000-0000-4000-8000-000000000003", source_id: sources[0].id, claim: "This claim is post-snapshot.", supporting_quote: null, stance: "context", confidence: null, created_at: "2026-11-01T00:00:00.000Z", quote_match_status: "not_recorded", claim_support_status: "not_independently_verified", passage_start_codepoint: null, passage_end_codepoint: null },
];
test("saved graph preserves existing UUIDs, source links, quote match and counter-claim edges", () => {
  const graph = buildSavedEvidenceGraph({ run, sources, evidence });
  const byId = new Map(graph.nodes.map(node => [node.id, node]));
  const claim = graph.nodes.find(node => node.type === "claim" && node.stance === "supports");
  assert.equal(claim.id, `claim:${evidence[0].id}`);
  assert.equal(claim.sourceId, `source:${sources[0].id}`);
  assert.equal(claim.claimSupportStatus, "not_independently_verified");
  assert.equal(claim.quoteMatchStatus, "matched_to_captured_text");
  const passage = graph.nodes.find(node => node.type === "passage");
  assert.equal(passage.text, "Revenue grew 8 percent.");
  assert.equal(passage.exactQuoteVerified, undefined);
  assert.ok(graph.edges.some(edge => edge.from === claim.id && edge.to === `event:${run.id}` && edge.relation === "supports"));
  const counter = graph.nodes.find(node => node.type === "claim" && node.stance === "contradicts");
  assert.ok(graph.edges.some(edge => edge.from === counter.id && edge.relation === "challenges"));
  assert.equal(byId.get(`source:${sources[1].id}`), undefined);
  assert.equal(byId.get(`source:${sources[2].id}`), undefined);
  assert.equal(byId.get(`source:${sources[3].id}`), undefined);
  assert.ok(graph.limitations.some(item => item.includes("do not independently verify claim truth")));
});

test("a database match whose captured span no longer equals the quote is not upgraded", () => {
  const graph = buildSavedEvidenceGraph({ run, sources, evidence: [{ ...evidence[0], supporting_quote: "Forged quote." }] });
  const claim = graph.nodes.find(node => node.type === "claim");
  assert.equal(claim.quoteMatchStatus, "recorded_match_not_reproduced");
  assert.equal(graph.nodes.some(node => node.type === "passage"), false);
});

test("saved brief publication dates filter future and snapshot-day date-only sources", () => {
  const graph = buildSavedEvidenceGraph({ run, sources, evidence: [
    ...evidence,
    { ...evidence[0], id: "30000000-0000-4000-8000-000000000004", source_id: sources[2].id, created_at: "2026-10-31T19:14:00.000Z" },
    { ...evidence[0], id: "30000000-0000-4000-8000-000000000005", source_id: sources[3].id, created_at: "2026-10-31T19:14:00.000Z" },
  ] });
  assert.equal(graph.nodes.some(node => node.id === `source:${sources[2].id}`), false);
  assert.equal(graph.nodes.some(node => node.id === `source:${sources[3].id}`), false);
  assert.equal(graph.nodes.some(node => node.id === "claim:30000000-0000-4000-8000-000000000004"), false);
  assert.equal(graph.nodes.some(node => node.id === "claim:30000000-0000-4000-8000-000000000005"), false);
});

test("quote reproduction follows brief normalization but preserves the original captured passage", () => {
  const excerpt = "Revenue\n GREW\t8 percent.";
  const quote = "revenue grew 8 PERCENT.";
  const span = findQuotePassageSpan(excerpt, quote);
  const graph = buildSavedEvidenceGraph({ run, sources: [{ ...sources[0], excerpt }], evidence: [{
    ...evidence[0], supporting_quote: quote, passage_start_codepoint: span.start_codepoint, passage_end_codepoint: span.end_codepoint,
  }] });
  const claim = graph.nodes.find(node => node.type === "claim");
  const passage = graph.nodes.find(node => node.type === "passage");
  assert.equal(claim.quoteMatchStatus, "matched_to_captured_text");
  assert.equal(passage.text, "Revenue\n GREW\t8 percent.");
});

test("long whitespace spans return the complete reproduced passage within the excerpt bound", () => {
  const excerpt = `Revenue${" ".repeat(1_500)}grew 8 percent.`;
  const quote = "Revenue grew 8 percent.";
  const graph = buildSavedEvidenceGraph({ run, sources: [{ ...sources[0], excerpt }], evidence: [{
    ...evidence[0], supporting_quote: quote, passage_start_codepoint: 0, passage_end_codepoint: Array.from(excerpt).length,
  }] });
  const claim = graph.nodes.find(node => node.type === "claim");
  assert.equal(claim.quoteMatchStatus, "matched_to_captured_text");
  const passage = graph.nodes.find(node => node.type === "passage");
  assert.ok(passage);
  assert.equal(passage.text, excerpt, "the whole captured span is returned, including whitespace normalized for matching");
  assert.equal(passage.text.toLowerCase().replace(/\s+/g, " ").trim(), quote.toLowerCase());
});

test("publication metadata accepts only complete valid dates or timezone-qualified timestamps", () => {
  const invalid = ["2026-10", "2026-10-31T23:00:00", "2026-02-30", "2026-10-31T25:00:00Z"];
  const graph = buildSavedEvidenceGraph({
    run: { ...run, summary: { sources: invalid.map((publication_date, index) => ({ url: `https://example.com/invalid-${index}`, publication_date })) } },
    sources: invalid.map((_, index) => ({ ...sources[0], id: `20000000-0000-4000-8000-${String(index + 10).padStart(12, "0")}`, url: `https://example.com/invalid-${index}`, published_at: null })),
    evidence: [],
  });
  assert.equal(graph.nodes.filter(node => node.type === "source").length, 0);
});

test("RFC3339 publication timestamps accept lowercase t and z", () => {
  const graph = buildSavedEvidenceGraph({
    run: { ...run, summary: { sources: [{ url: sources[0].url, publication_date: "2026-10-30t12:00:00z" }] } },
    sources: [{ ...sources[0], published_at: null, retrieved_at: "2026-10-31t19:10:00.000z" }],
    evidence: [],
  });
  const source = graph.nodes.find(node => node.type === "source");
  assert.equal(source.publishedAt, "2026-10-30T12:00:00.000Z");
  assert.equal(source.retrievedAt, "2026-10-31T19:10:00.000Z");
});

test("retrieval timestamps require RFC3339 timezones", () => {
  assert.throws(() => buildSavedEvidenceGraph({ run: { ...run, completed_at: "2026-10-31T20:00:00" }, sources: [], evidence: [] }), /invalid-asof/);
  const graph = buildSavedEvidenceGraph({ run, sources: [{ ...sources[0], retrieved_at: "2026-10-31T19:10:00" }], evidence: [] });
  assert.equal(graph.nodes.some(node => node.type === "source"), false);
});

test("invalid run as-of time is rejected", () => {
  assert.throws(() => buildSavedEvidenceGraph({ run: { ...run, completed_at: null }, sources, evidence }), /invalid-asof/);
});


test("saved graph text limits accept writer-sized excerpts and reject oversized source or evidence text", () => {
  const boundedSource = { ...sources[0], excerpt: "x".repeat(SAVED_GRAPH_INPUT_LIMITS.sourceExcerptCodeUnits) };
  assert.equal(savedGraphInputsWithinLimits([boundedSource], evidence), true);
  assert.equal(savedGraphInputsWithinLimits([{ ...boundedSource, url: "u".repeat(SAVED_GRAPH_INPUT_LIMITS.sourceUrlCodeUnits + 1) }], evidence), false);
  assert.equal(savedGraphInputsWithinLimits([{ ...boundedSource, title: "t".repeat(SAVED_GRAPH_INPUT_LIMITS.sourceTitleCodeUnits + 1) }], evidence), false);
  assert.equal(savedGraphInputsWithinLimits([{ ...boundedSource, publisher: "p".repeat(SAVED_GRAPH_INPUT_LIMITS.sourcePublisherCodeUnits + 1) }], evidence), false);
  assert.equal(savedGraphInputsWithinLimits([{ ...boundedSource, content_hash: "h".repeat(SAVED_GRAPH_INPUT_LIMITS.sourceContentHashCodeUnits + 1) }], []), false);
  assert.equal(savedGraphInputsWithinLimits([{ ...boundedSource, excerpt: "x".repeat(SAVED_GRAPH_INPUT_LIMITS.sourceExcerptCodeUnits + 1) }], evidence), false);
  assert.equal(savedGraphInputsWithinLimits(sources, [{ ...evidence[0], claim: "x".repeat(SAVED_GRAPH_INPUT_LIMITS.evidenceClaimCodeUnits + 1) }]), false);
  assert.equal(savedGraphInputsWithinLimits(sources, [{ ...evidence[0], supporting_quote: "x".repeat(SAVED_GRAPH_INPUT_LIMITS.evidenceQuoteCodeUnits + 1) }]), false);
  assert.equal(savedGraphInputsWithinLimits([{ ...boundedSource, url: undefined }], []), false);
  assert.equal(savedGraphInputsWithinLimits([{ ...boundedSource, content_hash: 123 }], []), false);
  const maxRows = Array.from({ length: 90 }, () => ({ ...sources[0], url: "u".repeat(4_096), title: "t".repeat(300), publisher: "p".repeat(120), excerpt: "e".repeat(6_000) }));
  const maxEvidence = Array.from({ length: 500 }, (_, index) => ({ ...evidence[0], id: `30000000-0000-4000-8000-${String(index).padStart(12, "0")}`, claim: "c".repeat(2_000), supporting_quote: "q".repeat(600) }));
  assert.equal(savedGraphInputsWithinLimits(maxRows, maxEvidence), false);
});

test("graph builder fails closed for oversized text before constructing nodes", () => {
  assert.throws(() => buildSavedEvidenceGraph({ run, sources: [{ ...sources[0], excerpt: "x".repeat(SAVED_GRAPH_INPUT_LIMITS.sourceExcerptCodeUnits + 1) }], evidence: [] }), /input-too-large/);
});
