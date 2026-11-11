import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "./decision-capsules") return { url: new URL("../lib/decision-capsules.ts", import.meta.url).href, shortCircuit: true };
  if (specifier === "./decision-capsule-events") return { url: new URL("../lib/decision-capsule-events.ts", import.meta.url).href, shortCircuit: true };
  if (specifier === "./instrument-identity") return { url: new URL("../lib/instrument-identity.ts", import.meta.url).href, shortCircuit: true };
  return nextResolve(specifier, context);
} });
const { buildPublicCapsuleSnapshot, capsulePublicationHash, hashPublicationToken, verifyPublicCapsuleSnapshot } = await import("../lib/decision-capsule-public.ts");
const { hashCapsuleSnapshot } = await import("../lib/decision-capsules.ts");
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
  assert.deepEqual(Object.keys(researchOnly).sort(), ["integrityScope", "research", "schemaVersion", "sourceAuthenticity", "sourceCapsuleIntegrityHash", "urlPolicyVersion"]);
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

test("research-only disclosure preserves evidence-brief narrative without sources or private identifiers", () => {
  const snapshot = structuredClone(privateSnapshot);
  snapshot.research.summary = {
    summary: "Revenue growth is reported in the excerpt. 80000000-0000-4000-8000-000000000001 https://example.com/private",
    answer_status: "source_matched_claims",
    upside: "Demand improved",
    downside: "Margins remain uncertain",
    catalysts: ["Next earnings"],
    what_would_change: ["A revised filing", "Check https://example.com/internal before the next report"],
    research_run_id: "90000000-0000-4000-8000-000000000001",
    claims: [{ claim: "private" }],
    sources: [{ url: "https://example.com/private" }],
  };
  const projection = buildPublicCapsuleSnapshot({ originalSnapshot: snapshot, capsuleIntegrityHash: "c".repeat(64), events: [], selection: { research: true, evidence: false, events: false } });
  assert.equal(projection.research.summary.summary, "Revenue growth is reported in the excerpt. [private identifier omitted] [source link omitted]");
  assert.equal(projection.research.summary.answer_status, "source_matched_claims");
  assert.equal(projection.research.summary.upside, "Demand improved");
  assert.equal(projection.research.summary.downside, "Margins remain uncertain");
  assert.deepEqual(projection.research.summary.catalysts, ["Next earnings"]);
  assert.deepEqual(projection.research.summary.what_would_change, ["A revised filing", "Check [source link omitted] before the next report"]);
  assert.equal("research_run_id" in projection.research.summary, false);
  assert.equal("claims" in projection.research.summary, false);
  assert.equal("sources" in projection.research.summary, false);
  assert.equal(verifyPublicCapsuleSnapshot(projection), true);
});

test("evidence projection omits non-HTTPS sources and never publishes internal source IDs", () => {
  const sourceWithSecretUrl = structuredClone(privateSnapshot);
  sourceWithSecretUrl.sources.push({ id: "private-signed-source", url: "https://files.example.com/filing?X-Amz-Signature=private-secret", title: "Signed filing", publisher: "Issuer", publishedAt: null, retrievedAt: "2026-11-01T00:01:00.000Z", sourceType: "primary", excerpt: "private", contentHash: null });
  sourceWithSecretUrl.sources.push({ id: "private-key-source", url: "https://files.example.com/key?KEY=private-secret", title: "Key URL", publisher: "Issuer", publishedAt: null, retrievedAt: "2026-11-01T00:01:00.000Z", sourceType: "primary", excerpt: "private", contentHash: null });
  sourceWithSecretUrl.sources.push({ id: "private-client-secret-source", url: "https://files.example.com/client?Client_Secret=private-secret", title: "Client secret URL", publisher: "Issuer", publishedAt: null, retrievedAt: "2026-11-01T00:01:00.000Z", sourceType: "primary", excerpt: "private", contentHash: null });
  sourceWithSecretUrl.sources.push({ id: "private-fragment-source", url: "https://files.example.com/filing#access_token=private-secret", title: "Fragment URL", publisher: "Issuer", publishedAt: null, retrievedAt: "2026-11-01T00:01:00.000Z", sourceType: "primary", excerpt: "private", contentHash: null });
  const snapshot = buildPublicCapsuleSnapshot({ originalSnapshot: sourceWithSecretUrl, capsuleIntegrityHash: "c".repeat(64), events: [], selection: { research: false, evidence: true, events: false } });
  assert.equal(snapshot.evidence.sources.length, 1);
  assert.equal(snapshot.evidence.sources[0].url, "https://example.com/filing");
  assert.equal(snapshot.evidence.claims[0].sourceUrl, "https://example.com/filing");
  assert.equal(JSON.stringify(snapshot).includes(sourceId), false);
  assert.equal(JSON.stringify(snapshot).includes("private-secret"), false);
  assert.equal(JSON.stringify(snapshot).includes("passageStartCodepoint"), false);
  const malformed = structuredClone(snapshot); malformed.evidence.claims[0].confidence = 1.5;
  assert.equal(verifyPublicCapsuleSnapshot(malformed), false);
});

test("strict URL policy applies to new copies while v1 snapshots retain their original verification rules", () => {
  const current = buildPublicCapsuleSnapshot({ originalSnapshot: privateSnapshot, capsuleIntegrityHash: "c".repeat(64), events: [], selection: { research: false, evidence: true, events: false } });
  assert.equal(current.urlPolicyVersion, 3);
  const legacy = structuredClone(current);
  delete legacy.urlPolicyVersion;
  legacy.evidence.sources[0].url = "https://example.com/filing#access_token=legacy";
  legacy.evidence.claims[0].sourceUrl = legacy.evidence.sources[0].url;
  assert.equal(verifyPublicCapsuleSnapshot(legacy), true);
  assert.equal(verifyPublicCapsuleSnapshot(current), true);
});

test("v2 rejects credential query names across evidence and event URLs", () => {
  const names = [
    "key", "client_secret", "access-token", "refresh_token", "token", "api_key", "secret", "signature", "sig", "session", "sessionid", "auth", "authorization", "password", "passwd", "x-amz-credential", "x-amz-signature", "x-amz-security-token", "x-goog-credential", "x-goog-signature",
    "id_token", "ID-TOKEN", "idtoken", "id%5Ftoken", "session_id", "SESSION-ID", "x-api-key", "X_API_KEY", "xapikey",
  ];
  for (const name of names) {
    const url = `https://example.com/filing?ordinary=1&${name}=private`;
    const original = structuredClone(privateSnapshot);
    original.sources[0].url = url;
    const forecast = { ...event, payload: { ...event.payload, referenceSourceUrl: url, referenceSourceTimestamp: "2026-11-01T00:01:00.000Z", referenceReportedBy: "user" } };
    const outcome = { ...event, id: "90000000-0000-4000-8000-000000000002", sequence: 2, type: "outcome", forecastEventId: forecast.id, payload: { forecastEventId: forecast.id, observedPrice: 101, observedAt: "2026-11-03T00:00:00.000Z", sourceUrl: url, sourceTimestamp: "2026-11-03T00:01:00.000Z", reportedBy: "user", actualReturnPercent: 1, forecastMet: false } };
    const projection = buildPublicCapsuleSnapshot({ originalSnapshot: original, capsuleIntegrityHash: "c".repeat(64), events: [forecast, outcome], selection: { research: false, evidence: true, events: true } });
    assert.deepEqual(projection.evidence.sources, [], name);
    assert.equal(projection.evidence.claims[0].sourceUrl, null, name);
    assert.equal(projection.events[0].payload.referenceSourceUrl, null, name);
    assert.equal(projection.events[0].payload.referenceSourceUrlRedacted, true, name);
    assert.equal(projection.events[1].payload.sourceUrl, null, name);
    assert.equal(projection.events[1].payload.sourceUrlRedacted, true, name);
    assert.equal(verifyPublicCapsuleSnapshot(projection), true, name);
    for (const [index, field] of [[0, "referenceSourceUrl"], [1, "sourceUrl"]]) {
      const tampered = structuredClone(projection);
      tampered.events[index].payload[field] = url;
      delete tampered.events[index].payload[`${field}Redacted`];
      for (let i = index; i < tampered.events.length; i += 1) {
        if (i > index) tampered.events[i].previousHash = tampered.events[i - 1].integrityHash;
        const unsigned = { ...tampered.events[i] };
        delete unsigned.integrityHash;
        tampered.events[i].integrityHash = hashCapsuleSnapshot(unsigned);
      }
      assert.equal(verifyPublicCapsuleSnapshot(tampered), false, `${name}: ${field}`);
    }
  }
});

test("URL verification rejects new v2 names and retains v1 and ordinary links", () => {
  const original = structuredClone(privateSnapshot);
  original.sources[0].url = "https://example.com/filing?topic=id_token&session_identifier=report&api_key_info=public";
  const current = buildPublicCapsuleSnapshot({ originalSnapshot: original, capsuleIntegrityHash: "c".repeat(64), events: [], selection: { research: false, evidence: true, events: false } });
  assert.equal(current.evidence.sources[0].url, original.sources[0].url);
  assert.equal(current.evidence.claims[0].sourceUrl, original.sources[0].url);
  assert.equal(verifyPublicCapsuleSnapshot(current), true);

  for (const name of ["id_token", "session_id", "x-api-key"]) {
    const url = `https://example.com/filing?${name}=private`;
    const source = structuredClone(current); source.evidence.sources[0].url = url;
    assert.equal(verifyPublicCapsuleSnapshot(source), false, name);
    const claim = structuredClone(current); claim.evidence.claims[0].sourceUrl = url;
    assert.equal(verifyPublicCapsuleSnapshot(claim), false, name);
    delete source.urlPolicyVersion;
    source.evidence.claims[0].sourceUrl = url;
    assert.equal(verifyPublicCapsuleSnapshot(source), true, name);
  }
});

test("public prose fields redact embedded identifiers and URLs before integrity hashing", () => {
  const snapshot = structuredClone(privateSnapshot);
  snapshot.research.question = "Review 80000000-0000-4000-8000-000000000001 https://internal.example/path";
  snapshot.sources[0].title = "Filing 80000000-0000-4000-8000-000000000002";
  snapshot.sources[0].publisher = "Issuer https://internal.example/source";
  snapshot.sources[0].excerpt = "See 80000000-0000-4000-8000-000000000003 and https://internal.example/excerpt";
  snapshot.evidence[0].claim = "Claim linked to 80000000-0000-4000-8000-000000000004";
  snapshot.evidence[0].supportingQuote = "Quote https://internal.example/quote";
  const projection = buildPublicCapsuleSnapshot({ originalSnapshot: snapshot, capsuleIntegrityHash: "c".repeat(64), events: [], selection: { research: true, evidence: true, events: false } });
  const encoded = JSON.stringify(projection);
  assert.equal(encoded.includes("internal.example"), false);
  assert.equal(encoded.includes("80000000-0000-4000-8000-00000000000"), false);
  assert.match(projection.research.question, /\[private identifier omitted\]/);
  assert.match(projection.evidence.sources[0].title, /\[private identifier omitted\]/);
  assert.match(projection.evidence.claims[0].claim, /\[private identifier omitted\]/);
  assert.equal(verifyPublicCapsuleSnapshot(projection), true);
  assert.equal(capsulePublicationHash(projection).length, 64);
});

test("public prose redacts email addresses without changing explicit source URLs or numeric facts", () => {
  const snapshot = structuredClone(privateSnapshot);
  snapshot.research.question = 'Review NVDA with researcher@example.com, analyst@bücher.de, josé@example.org, and "Jane Doe"@example.org. Follow up with analyst@example.net. Reference price $100.25; funding 100@12.50';
  snapshot.sources[0].excerpt = "Contact analyst+private@example.org about the filing.";
  const projection = buildPublicCapsuleSnapshot({ originalSnapshot: snapshot, capsuleIntegrityHash: "c".repeat(64), events: [], selection: { research: true, evidence: true, events: false } });
  const encoded = JSON.stringify(projection);
  assert.equal(encoded.includes("researcher@example.com"), false);
  assert.equal(encoded.includes("analyst@bücher.de"), false);
  assert.equal(encoded.includes("josé@example.org"), false);
  assert.equal(encoded.includes('"Jane Doe"@example.org'), false);
  assert.equal(encoded.includes("analyst@example.net"), false);
  assert.equal(encoded.includes("analyst+private@example.org"), false);
  assert.match(projection.research.question, /\[email omitted\]/);
  assert.match(projection.research.question, /\$100\.25/);
  assert.match(projection.research.question, /100@12\.50/);
  assert.equal(projection.evidence.sources[0].url, "https://example.com/filing");
  assert.equal(verifyPublicCapsuleSnapshot(projection), true);
});

test("research projection rejects malformed timestamps and non-JSON summary values", () => {
  const snapshot = buildPublicCapsuleSnapshot({ originalSnapshot: privateSnapshot, capsuleIntegrityHash: "c".repeat(64), events: [], selection: { research: true, evidence: false, events: false } });
  assert.equal(verifyPublicCapsuleSnapshot(snapshot), true);
  const invalidDate = structuredClone(snapshot); invalidDate.research.createdAt = "yesterday";
  assert.equal(verifyPublicCapsuleSnapshot(invalidDate), false);
  const invalidSummary = structuredClone(snapshot); invalidSummary.research.summary = Number.NaN;
  assert.equal(verifyPublicCapsuleSnapshot(invalidSummary), false);
  const rolledCalendarDate = structuredClone(snapshot); rolledCalendarDate.research.createdAt = "2026-02-30T00:00:00Z";
  assert.equal(verifyPublicCapsuleSnapshot(rolledCalendarDate), false);
});

test("event projection re-hashes a verifiable public chain without private capsule and idempotency identifiers", () => {
  const snapshot = buildPublicCapsuleSnapshot({ originalSnapshot: privateSnapshot, capsuleIntegrityHash: "c".repeat(64), events: [event], selection: { research: false, evidence: false, events: true } });
  assert.deepEqual(Object.keys(snapshot).sort(), ["eventAnchorHash", "events", "integrityScope", "schemaVersion", "sourceAuthenticity", "sourceCapsuleIntegrityHash", "urlPolicyVersion"]);
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

test("event provenance with credential-bearing URLs is redacted without making append-only history unshareable", () => {
  const forecast = {
    ...event,
    payload: {
      ...event.payload,
      referenceSourceUrl: "https://prices.example/nvda?api_key=private-secret",
      referenceSourceTimestamp: "2026-11-01T00:01:00.000Z",
      referenceReportedBy: "user",
    },
  };
  const outcome = {
    ...event,
    id: "90000000-0000-4000-8000-000000000002",
    sequence: 2,
    type: "outcome",
    forecastEventId: forecast.id,
    payload: {
      forecastEventId: forecast.id,
      observedPrice: 106,
      observedAt: "2026-11-03T00:00:00.000Z",
      sourceUrl: "https://prices.example/nvda#access_token=private-secret",
      sourceTimestamp: "2026-11-03T00:01:00.000Z",
      reportedBy: "user",
      actualReturnPercent: 6,
      forecastMet: true,
    },
    createdAt: "2026-11-03T00:02:00.000Z",
  };
  const snapshot = buildPublicCapsuleSnapshot({ originalSnapshot: privateSnapshot, capsuleIntegrityHash: "c".repeat(64), events: [forecast, outcome], selection: { research: false, evidence: false, events: true } });
  assert.equal(snapshot.events[0].payload.referenceSourceUrl, null);
  assert.equal(snapshot.events[0].payload.referenceSourceUrlRedacted, true);
  assert.equal(snapshot.events[1].payload.sourceUrl, null);
  assert.equal(snapshot.events[1].payload.sourceUrlRedacted, true);
  assert.equal(snapshot.events[0].payload.referenceSourceTimestamp, "2026-11-01T00:01:00.000Z");
  assert.equal(JSON.stringify(snapshot).includes("private-secret"), false);
  assert.equal(verifyPublicCapsuleSnapshot(snapshot), true);
  const tampered = structuredClone(snapshot);
  tampered.events[0].payload.referenceSourceUrlRedacted = false;
  assert.equal(verifyPublicCapsuleSnapshot(tampered), false);
});

test("common credential query names are redacted from event provenance", () => {
  const forecast = {
    ...event,
    payload: {
      ...event.payload,
      referenceSourceUrl: "https://prices.example/nvda?KEY=private-secret&Client_Secret=also-private&Refresh_Token=long-lived-secret",
      referenceSourceTimestamp: "2026-11-01T00:01:00.000Z",
      referenceReportedBy: "user",
    },
  };
  const snapshot = buildPublicCapsuleSnapshot({ originalSnapshot: privateSnapshot, capsuleIntegrityHash: "c".repeat(64), events: [forecast], selection: { research: false, evidence: false, events: true } });
  assert.equal(snapshot.events[0].payload.referenceSourceUrl, null);
  assert.equal(snapshot.events[0].payload.referenceSourceUrlRedacted, true);
  assert.equal(JSON.stringify(snapshot).includes("private-secret"), false);
  assert.equal(JSON.stringify(snapshot).includes("also-private"), false);
  assert.equal(JSON.stringify(snapshot).includes("long-lived-secret"), false);
  assert.equal(verifyPublicCapsuleSnapshot(snapshot), true);
});

test("policy v2 rejects unflagged null event URLs even when their event hash is recomputed", () => {
  const forecast = { ...event, payload: { ...event.payload, referenceSourceUrl: "https://prices.example/nvda?refresh-token=private", referenceSourceTimestamp: "2026-11-01T00:01:00.000Z", referenceReportedBy: "user" } };
  const snapshot = buildPublicCapsuleSnapshot({ originalSnapshot: privateSnapshot, capsuleIntegrityHash: "c".repeat(64), events: [forecast], selection: { research: false, evidence: false, events: true } });
  const tampered = structuredClone(snapshot);
  delete tampered.events[0].payload.referenceSourceUrlRedacted;
  const unsigned = { ...tampered.events[0] };
  delete unsigned.integrityHash;
  tampered.events[0].integrityHash = hashCapsuleSnapshot(unsigned);
  assert.equal(verifyPublicCapsuleSnapshot(tampered), false);

  const outcome = { ...event, id: "90000000-0000-4000-8000-000000000002", sequence: 2, type: "outcome", forecastEventId: forecast.id, payload: { forecastEventId: forecast.id, observedPrice: 101, observedAt: "2026-11-03T00:00:00.000Z", sourceUrl: "https://prices.example/nvda?refresh_token=private", sourceTimestamp: "2026-11-03T00:01:00.000Z", reportedBy: "user", actualReturnPercent: 1, forecastMet: false } };
  const withOutcome = buildPublicCapsuleSnapshot({ originalSnapshot: privateSnapshot, capsuleIntegrityHash: "c".repeat(64), events: [{ ...forecast, sequence: 1 }, outcome], selection: { research: false, evidence: false, events: true } });
  const outcomeTampered = structuredClone(withOutcome);
  delete outcomeTampered.events[1].payload.sourceUrlRedacted;
  const unsignedOutcome = { ...outcomeTampered.events[1] };
  delete unsignedOutcome.integrityHash;
  outcomeTampered.events[1].integrityHash = hashCapsuleSnapshot(unsignedOutcome);
  assert.equal(verifyPublicCapsuleSnapshot(outcomeTampered), false);
});

test("policy 3 redacts additional credential names and stored policy 2 copies keep their rules", () => {
  const names = ["auth_token", "oauth_token", "access_key", "access_key_id", "access-key-id", "AccessKeyId", "private_key", "credential", "credentials", "jwt", "bearer", "sas_token", "session_token", "session-token", "sessiontoken", "AWSAccessKeyId", "auth-token", "access-key"];
  const clean = buildPublicCapsuleSnapshot({ originalSnapshot: privateSnapshot, capsuleIntegrityHash: "c".repeat(64), events: [], selection: { research: false, evidence: true, events: false } });
  assert.equal(clean.urlPolicyVersion, 3);
  for (const name of names) {
    const url = `https://example.com/filing?${name}=secret-value`;
    const original = structuredClone(privateSnapshot);
    original.sources[0].url = url;
    const forecast = { ...event, payload: { ...event.payload, referenceSourceUrl: url, referenceSourceTimestamp: "2026-11-01T00:01:00.000Z", referenceReportedBy: "user" } };
    const projection = buildPublicCapsuleSnapshot({ originalSnapshot: original, capsuleIntegrityHash: "c".repeat(64), events: [forecast], selection: { research: false, evidence: true, events: true } });
    assert.equal(projection.urlPolicyVersion, 3, name);
    assert.deepEqual(projection.evidence.sources, [], name);
    assert.equal(projection.evidence.claims[0].sourceUrl, null, name);
    assert.equal(projection.events[0].payload.referenceSourceUrl, null, name);
    assert.equal(projection.events[0].payload.referenceSourceUrlRedacted, true, name);
    assert.equal(JSON.stringify(projection).includes("secret-value"), false, name);
    assert.equal(verifyPublicCapsuleSnapshot(projection), true, name);

    const stored = structuredClone(clean);
    stored.urlPolicyVersion = 2;
    stored.evidence.sources[0].url = url;
    stored.evidence.claims[0].sourceUrl = url;
    assert.equal(verifyPublicCapsuleSnapshot(stored), true, `stored v2 ${name}`);
    stored.urlPolicyVersion = 3;
    assert.equal(verifyPublicCapsuleSnapshot(stored), false, `v3 rejects stored ${name}`);
  }

  const ordinary = structuredClone(privateSnapshot);
  ordinary.sources[0].url = "https://example.com/filing?auth_token_info=public&session_token_label=note";
  const kept = buildPublicCapsuleSnapshot({ originalSnapshot: ordinary, capsuleIntegrityHash: "c".repeat(64), events: [], selection: { research: false, evidence: true, events: false } });
  assert.equal(kept.evidence.sources[0].url, ordinary.sources[0].url);
  assert.equal(verifyPublicCapsuleSnapshot(kept), true);
});

test("event provenance stores the canonical URL used by snapshot verification", () => {
  const forecast = { ...event, payload: { ...event.payload, referenceSourceUrl: "https://EXAMPLE.com:443/quote", referenceSourceTimestamp: "2026-11-01T00:01:00.000Z", referenceReportedBy: "user" } };
  const outcome = {
    ...event, id: "90000000-0000-4000-8000-000000000002", sequence: 2, type: "outcome", forecastEventId: forecast.id,
    payload: { forecastEventId: forecast.id, observedPrice: 101, observedAt: "2026-11-03T00:00:00.000Z", sourceUrl: "https://EXAMPLE.com:443/close", sourceTimestamp: "2026-11-03T00:01:00.000Z", reportedBy: "user", actualReturnPercent: 1, forecastMet: false },
    createdAt: "2026-11-03T00:02:00.000Z",
  };
  const snapshot = buildPublicCapsuleSnapshot({ originalSnapshot: privateSnapshot, capsuleIntegrityHash: "c".repeat(64), events: [forecast, outcome], selection: { research: false, evidence: false, events: true } });
  assert.equal(snapshot.events[0].payload.referenceSourceUrl, "https://example.com/quote");
  assert.equal("referenceSourceUrlRedacted" in snapshot.events[0].payload, false);
  assert.equal(snapshot.events[1].payload.sourceUrl, "https://example.com/close");
  assert.equal("sourceUrlRedacted" in snapshot.events[1].payload, false);
  assert.equal(verifyPublicCapsuleSnapshot(snapshot), true);
});

test("publication tokens are hashed before storage and empty projections are rejected", () => {
  assert.equal(hashPublicationToken("random-token"), hashPublicationToken("random-token"));
  assert.notEqual(hashPublicationToken("random-token"), "random-token");
  assert.throws(() => buildPublicCapsuleSnapshot({ originalSnapshot: privateSnapshot, capsuleIntegrityHash: "c".repeat(64), events: [], selection: { research: false, evidence: false, events: false } }), /Select at least one/);
});
