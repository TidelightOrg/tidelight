import test from "node:test";
import assert from "node:assert/strict";
import { buildOriginalCapsuleSnapshot, capsuleHashMatches, canonicalJson, hashCapsuleSnapshot } from "../lib/decision-capsules.ts";

test("canonical JSON sorts nested object keys and preserves array ordering", () => {
  assert.equal(canonicalJson({ z: 2, nested: { b: true, a: null }, list: ["x", "y"] }), '{"list":["x","y"],"nested":{"a":null,"b":true},"z":2}');
});

test("snapshot hash is stable across object insertion order and detects changes", () => {
  const a = { research: { question: "NVDA earnings?", summary: { stance: "unclear", confidence: 0 } }, sources: [{ url: "https://example.com", retrievedAt: "2026-01-01T00:00:00Z" }] };
  const b = { sources: [{ retrievedAt: "2026-01-01T00:00:00Z", url: "https://example.com" }], research: { summary: { confidence: 0, stance: "unclear" }, question: "NVDA earnings?" } };
  const hash = hashCapsuleSnapshot(a);
  assert.equal(hash, hashCapsuleSnapshot(b));
  assert.equal(capsuleHashMatches(b, hash), true);
  assert.equal(capsuleHashMatches({ ...b, research: { ...b.research, question: "Different question" } }, hash), false);
  assert.equal(capsuleHashMatches(b, "not-a-sha256"), false);
});

test("canonical JSON rejects non-JSON values and non-finite numbers", () => {
  assert.throws(() => canonicalJson({ n: Number.NaN }), /finite numbers/);
  assert.throws(() => canonicalJson({ d: new Date() }), /JSON values only/);
  const cyclic = {}; cyclic.self = cyclic;
  assert.throws(() => canonicalJson(cyclic));
});

test("original snapshot preserves persisted source and claim lineage without adding outcomes", () => {
  const snapshot = buildOriginalCapsuleSnapshot({ id: "run-1", question: "Question", status: "complete", summary: { summary: "Recorded interpretation" }, created_at: "2026-01-01T00:00:00Z", completed_at: "2026-01-01T00:01:00Z", model_name: "model" }, [
    { id: "source-1", url: "https://example.com", title: "Release", publisher: "Issuer", published_at: "2026-01-01T00:00:00Z", retrieved_at: "2026-01-01T00:00:30Z", source_type: "filing", excerpt: "Captured passage", content_hash: "hash" },
  ], [
    { source_id: "source-1", claim: "Revenue grew", supporting_quote: "Revenue grew by 10%", stance: "supports", confidence: 0.8, created_at: "2026-01-01T00:00:40Z", quote_match_status: "matched_to_captured_text", claim_support_status: "not_independently_verified", passage_start_codepoint: 42, passage_end_codepoint: 61 },
  ]);
  assert.equal(snapshot.sources[0].id, "source-1");
  assert.equal(snapshot.evidence[0].supportingQuote, "Revenue grew by 10%");
  assert.equal(snapshot.evidence[0].quoteMatchStatus, "matched_to_captured_text");
  assert.equal(snapshot.evidence[0].claimSupportStatus, "not_independently_verified");
  assert.equal(snapshot.evidence[0].passageStartCodepoint, 42);
  assert.equal(snapshot.evidence[0].passageEndCodepoint, 61);
  assert.equal("outcome" in snapshot, false);
});
