import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "./decision-capsules") return { url: new URL("../lib/decision-capsules.ts", import.meta.url).href, shortCircuit: true };
  if (specifier === "./decision-capsule-events") return { url: new URL("../lib/decision-capsule-events.ts", import.meta.url).href, shortCircuit: true };
  return nextResolve(specifier, context);
} });
const { buildPublicCapsuleSnapshot, capsulePublicationHash, hashPublicationToken, verifyPublicCapsuleSnapshot } = await import("../lib/decision-capsule-public.ts");
hooks.deregister();

const sourceId = "70000000-0000-4000-8000-000000000001";
const privateSnapshot = {
  schemaVersion: 1,
  origin: { type: "research_run", id: "80000000-0000-4000-8000-000000000001" },
  research: { question: "Review NVDA", status: "complete", createdAt: "2026-11-01T00:00:00.000Z", completedAt: "2026-11-01T00:01:00.000Z", model: "provider/model", summary: { stance: "mixed" } },
  sources: [
    { id: sourceId, url: "https://example.com/filing", title: "Filing", publisher: "Issuer", publishedAt: null, retrievedAt: "2026-11-01T00:01:00.000Z", sourceType: "primary", excerpt: "Public excerpt", contentHash: "private content hash" },
    { id: "unsafe", url: "http://example.com/private", title: "Unsafe", publisher: null, publishedAt: null, retrievedAt: "2026-11-01T00:01:00.000Z", sourceType: "unknown", excerpt: "omit", contentHash: null },
  ],
  evidence: [{ sourceId, claim: "Revenue accelerated", supportingQuote: "Revenue increased", stance: "supporting", confidence: 0.7, recordedAt: "2026-11-01T00:01:00.000Z", quoteMatchStatus: "exact", claimSupportStatus: "supported", passageStartCodepoint: 4, passageEndCodepoint: 20 }],
};
const event = {
  id: "90000000-0000-4000-8000-000000000001", capsuleId: "10000000-0000-4000-8000-000000000001", sequence: 1,
  type: "forecast", idempotencyKey: "20000000-0000-4000-8000-000000000001", forecastEventId: null,
  payload: { instrument: { type: "us_equity", symbol: "NVDA" }, referencePrice: 100, direction: "up", thresholdPercent: 5, horizonAt: "2026-11-03T00:00:00.000Z" },
  previousHash: "a".repeat(64), integrityHash: "b".repeat(64), createdAt: "2026-11-01T00:02:00.000Z",
};

test("public capsule projection includes only selected sections and excludes private storage identifiers", () => {
  const researchOnly = buildPublicCapsuleSnapshot({ originalSnapshot: privateSnapshot, capsuleIntegrityHash: "c".repeat(64), events: [event], selection: { research: true, evidence: false, events: false } });
  assert.deepEqual(Object.keys(researchOnly).sort(), ["integrityScope", "research", "schemaVersion", "sourceAuthenticity", "sourceCapsuleIntegrityHash"]);
  assert.equal(JSON.stringify(researchOnly).includes("80000000-0000-4000-8000-000000000001"), false);
  assert.equal(JSON.stringify(researchOnly).includes("private content hash"), false);
  assert.equal(JSON.stringify(researchOnly).includes("sourceId"), false);
});

test("research-only disclosure allowlists nested Agent Flow fields and strips private identifiers and evidence", () => {
  const snapshot = structuredClone(privateSnapshot);
  snapshot.research.summary = {
    researchRunId: "90000000-0000-4000-8000-000000000001",
    contextRunId: "90000000-0000-4000-8000-000000000002",
    evidenceGraph: { private: true },
    assets: [{ ticker: "NVDA", issuer: "NVIDIA", summary: "Revenue rose; https://example.com/private", stance: "mixed", confidence: 0.6, sources: [{ url: "https://example.com/private" }], evidenceBalance: { supporting: ["claim"] }, handoff: { href: "/private" }, tradeable: true }],
  };
  const projection = buildPublicCapsuleSnapshot({ originalSnapshot: snapshot, capsuleIntegrityHash: "c".repeat(64), events: [], selection: { research: true, evidence: false, events: false } });
  const encoded = JSON.stringify(projection);
  assert.equal(encoded.includes("90000000-0000-4000-8000-000000000001"), false);
  assert.equal(encoded.includes("evidenceGraph"), false);
  assert.equal(encoded.includes("private"), false);
  assert.equal(encoded.includes("sources"), false);
  assert.equal(projection.research.summary.assets[0].summary, "Revenue rose; [source link omitted]");
  assert.equal(verifyPublicCapsuleSnapshot(projection), true);
});

test("evidence projection omits non-HTTPS sources and never publishes internal source IDs", () => {
  const snapshot = buildPublicCapsuleSnapshot({ originalSnapshot: privateSnapshot, capsuleIntegrityHash: "c".repeat(64), events: [], selection: { research: false, evidence: true, events: false } });
  assert.equal(snapshot.evidence.sources.length, 1);
  assert.equal(snapshot.evidence.sources[0].url, "https://example.com/filing");
  assert.equal(snapshot.evidence.claims[0].sourceUrl, "https://example.com/filing");
  assert.equal(JSON.stringify(snapshot).includes(sourceId), false);
  assert.equal(JSON.stringify(snapshot).includes("passageStartCodepoint"), false);
  const malformed = structuredClone(snapshot); malformed.evidence.claims[0].confidence = 1.5;
  assert.equal(verifyPublicCapsuleSnapshot(malformed), false);
});

test("research projection rejects malformed timestamps and non-JSON summary values", () => {
  const snapshot = buildPublicCapsuleSnapshot({ originalSnapshot: privateSnapshot, capsuleIntegrityHash: "c".repeat(64), events: [], selection: { research: true, evidence: false, events: false } });
  assert.equal(verifyPublicCapsuleSnapshot(snapshot), true);
  const invalidDate = structuredClone(snapshot); invalidDate.research.createdAt = "yesterday";
  assert.equal(verifyPublicCapsuleSnapshot(invalidDate), false);
  const invalidSummary = structuredClone(snapshot); invalidSummary.research.summary = Number.NaN;
  assert.equal(verifyPublicCapsuleSnapshot(invalidSummary), false);
});

test("event projection re-hashes a verifiable public chain without private capsule and idempotency identifiers", () => {
  const snapshot = buildPublicCapsuleSnapshot({ originalSnapshot: privateSnapshot, capsuleIntegrityHash: "c".repeat(64), events: [event], selection: { research: false, evidence: false, events: true } });
  assert.deepEqual(Object.keys(snapshot).sort(), ["eventAnchorHash", "events", "integrityScope", "schemaVersion", "sourceAuthenticity", "sourceCapsuleIntegrityHash"]);
  assert.equal(snapshot.events[0].sequence, 1);
  assert.equal("capsuleId" in snapshot.events[0], false);
  assert.equal("idempotencyKey" in snapshot.events[0], false);
  assert.equal("id" in snapshot.events[0], false);
  assert.equal(verifyPublicCapsuleSnapshot(snapshot), true, JSON.stringify(snapshot));
  assert.equal(capsulePublicationHash(snapshot), capsulePublicationHash(structuredClone(snapshot)));
  assert.notEqual(capsulePublicationHash(snapshot), capsulePublicationHash({ ...snapshot, events: [] }));
  const tampered = structuredClone(snapshot); tampered.events[0].payload.referencePrice = 101;
  assert.equal(verifyPublicCapsuleSnapshot(tampered), false);
});

test("public outcome records retain reproducible return, threshold, and Brier calculations", () => {
  const forecast = { ...event, sequence: 1, payload: { ...event.payload, probability: 0.7, referenceSourceUrl: "https://example.com/quote", referenceSourceTimestamp: "2026-11-01T00:01:00.000Z", referenceReportedBy: "user" } };
  const outcome = {
    ...event, id: "90000000-0000-4000-8000-000000000002", sequence: 2, type: "outcome", forecastEventId: forecast.id,
    payload: { forecastEventId: forecast.id, observedPrice: 106, observedAt: "2026-11-03T00:00:00.000Z", sourceUrl: "https://example.com/close", sourceTimestamp: "2026-11-03T00:01:00.000Z", reportedBy: "user", actualReturnPercent: 6.000000000000005, forecastMet: true, brierScore: (0.7 - 1) ** 2 },
    createdAt: "2026-11-03T00:02:00.000Z",
  };
  const snapshot = buildPublicCapsuleSnapshot({ originalSnapshot: privateSnapshot, capsuleIntegrityHash: "c".repeat(64), events: [forecast, outcome], selection: { research: false, evidence: false, events: true } });
  assert.equal(verifyPublicCapsuleSnapshot(snapshot), true);
  const incorrect = structuredClone(outcome); incorrect.payload.actualReturnPercent = 9;
  assert.throws(() => buildPublicCapsuleSnapshot({ originalSnapshot: privateSnapshot, capsuleIntegrityHash: "c".repeat(64), events: [forecast, incorrect], selection: { research: false, evidence: false, events: true } }), /projection failed validation/);
});

test("publication tokens are hashed before storage and empty projections are rejected", () => {
  assert.equal(hashPublicationToken("random-token"), hashPublicationToken("random-token"));
  assert.notEqual(hashPublicationToken("random-token"), "random-token");
  assert.throws(() => buildPublicCapsuleSnapshot({ originalSnapshot: privateSnapshot, capsuleIntegrityHash: "c".repeat(64), events: [], selection: { research: false, evidence: false, events: false } }), /Select at least one/);
});
