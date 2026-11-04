import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const calls = [];
globalThis.capsuleRouteTest = { user: { id: "test-owner" }, sources: [], evidence: [] };
globalThis.flowTest = { user: globalThis.capsuleRouteTest.user };
globalThis.flowTest.admin = {
  from(table) {
    const query = {
      operation: "select",
      select() { return this; },
      eq() { return this; },
      order() { return this; },
      limit() { return this; },
      maybeSingle() {
        if (table === "decision_capsules" && this.operation === "insert") {
          return Promise.resolve({ data: globalThis.capsuleRouteTest.insertedCapsule ?? null, error: null });
        }
        return Promise.resolve({ data: table === "research_runs" ? {
          id: "d475bd46-5035-4ae5-9f19-e2959a4f0734",
          question: "Macro research with no persisted sources",
          status: "complete",
          summary: { note: "Fixture summary" },
          created_at: "2026-11-01T00:00:00Z",
          completed_at: "2026-11-01T00:01:00Z",
          model_name: "fixture-model",
        } : table === "decision_capsules" ? globalThis.capsuleRouteTest.existingCapsule ?? null : null,
        error: table === "decision_capsules" ? globalThis.capsuleRouteTest.capsuleLookupError ?? null : null });
      },
      insert(rows) { this.operation = "insert"; calls.push({ table, operation: "insert", rows }); return this; },
      then(resolve, reject) {
        const data = table === "research_sources" ? globalThis.capsuleRouteTest.sources : table === "research_evidence" ? globalThis.capsuleRouteTest.evidence : [];
        return Promise.resolve({ data, error: null, count: data.length }).then(resolve, reject);
      },
    };
    return query;
  },
};

const fixture = new URL("./fixtures/research-flow-integration-mocks.mjs", import.meta.url).href;
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "next/server" || specifier === "@/lib/supabase/admin" || specifier === "@/lib/supabase/auth-user") {
    return { url: fixture, shortCircuit: true };
  }
  if (specifier === "@/lib/decision-capsules") {
    return { url: new URL("../lib/decision-capsules.ts", import.meta.url).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
} });
const route = await import("../app/api/decision-capsules/route.ts");
const verifyRoute = await import("../app/api/decision-capsules/[id]/route.ts");
hooks.deregister();

test("capsule creation rejects a completed source-empty run without inserting a capsule", async () => {
  calls.length = 0;
  const response = await route.POST(new Request("https://tidelight.app/api/decision-capsules", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ researchRunId: "d475bd46-5035-4ae5-9f19-e2959a4f0734" }),
  }));

  assert.equal(response.status, 422);
  assert.match((await response.json()).error, /at least one persisted research source/i);
  assert.deepEqual(calls, []);
});

test("capsule capture rejects non-null evidence links outside the captured source set", async () => {
  calls.length = 0;
  globalThis.capsuleRouteTest.sources = [{ id: "captured-source" }];
  globalThis.capsuleRouteTest.evidence = [{ source_id: "missing-source" }];
  const response = await route.POST(new Request("https://tidelight.app/api/decision-capsules", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ researchRunId: "d475bd46-5035-4ae5-9f19-e2959a4f0734" }),
  }));

  assert.equal(response.status, 409);
  assert.match((await response.json()).error, /source lineage changed/i);
  assert.deepEqual(calls, []);
  globalThis.capsuleRouteTest.sources = [];
  globalThis.capsuleRouteTest.evidence = [];
});

test("capsule capture preserves evidence whose source link is null", async () => {
  calls.length = 0;
  globalThis.capsuleRouteTest.sources = [{ id: "captured-source", url: "https://source.example", title: "Source", publisher: "Fixture", published_at: null, retrieved_at: "2026-11-02T00:00:00Z", source_type: "report", excerpt: "Captured text", content_hash: null }];
  globalThis.capsuleRouteTest.evidence = [{ source_id: null, claim: "Unlinked claim", supporting_quote: null, stance: "unclear", confidence: 0.2, created_at: "2026-11-02T00:00:00Z", quote_match_status: "not_recorded", claim_support_status: "not_independently_verified", passage_start_codepoint: null, passage_end_codepoint: null }];
  globalThis.capsuleRouteTest.insertedCapsule = { id: "inserted-capsule", created_at: "2026-11-02T00:00:00Z", original_snapshot: {}, integrity_hash: "a".repeat(64), hash_algorithm: "sha256", schema_version: 1 };
  const response = await route.POST(new Request("https://tidelight.app/api/decision-capsules", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ researchRunId: "d475bd46-5035-4ae5-9f19-e2959a4f0734" }),
  }));

  assert.equal(response.status, 201);
  const insert = calls.findLast(call => call.table === "decision_capsules" && call.operation === "insert");
  assert.equal(insert.rows.original_snapshot.evidence[0].sourceId, null);
  globalThis.capsuleRouteTest.sources = [];
  globalThis.capsuleRouteTest.evidence = [];
  globalThis.capsuleRouteTest.insertedCapsule = null;
});

test("capsule retries return the verified saved capsule before requiring source rows", async () => {
  calls.length = 0;
  const { hashCapsuleSnapshot } = await import("../lib/decision-capsules.ts");
  const snapshot = { schemaVersion: 1, research: { question: "Original saved decision" }, sources: [], evidence: [] };
  const capsule = {
    id: "capsule-id",
    created_at: "2026-11-02T00:00:00.000Z",
    original_snapshot: snapshot,
    integrity_hash: hashCapsuleSnapshot(snapshot),
    hash_algorithm: "sha256",
    schema_version: 1,
  };
  globalThis.capsuleRouteTest.existingCapsule = capsule;

  const response = await route.POST(new Request("https://tidelight.app/api/decision-capsules", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ researchRunId: "d475bd46-5035-4ae5-9f19-e2959a4f0734" }),
  }));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { capsule, integrity: "valid" });
  assert.deepEqual(calls, []);

  globalThis.capsuleRouteTest.existingCapsule = { ...capsule, integrity_hash: "0".repeat(64) };
  const invalid = await route.POST(new Request("https://tidelight.app/api/decision-capsules", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ researchRunId: "d475bd46-5035-4ae5-9f19-e2959a4f0734" }),
  }));
  assert.equal(invalid.status, 409);
  assert.match((await invalid.json()).error, /integrity verification failed/i);

  globalThis.capsuleRouteTest.existingCapsule = null;
  globalThis.capsuleRouteTest.capsuleLookupError = { message: "fixture read failure" };
  const lookupFailure = await route.POST(new Request("https://tidelight.app/api/decision-capsules", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ researchRunId: "d475bd46-5035-4ae5-9f19-e2959a4f0734" }),
  }));
  assert.equal(lookupFailure.status, 503);
  assert.match((await lookupFailure.json()).error, /could not be verified/i);
  globalThis.capsuleRouteTest.existingCapsule = null;
  globalThis.capsuleRouteTest.capsuleLookupError = null;
});

test("verified capsule evidence downloads as a private attachment only after owner and hash checks", async () => {
  const { hashCapsuleSnapshot } = await import("../lib/decision-capsules.ts");
  const snapshot = { schemaVersion: 1, research: { question: "Recorded evidence" }, sources: [], evidence: [] };
  const capsule = {
    id: "d475bd46-5035-4ae5-9f19-e2959a4f0734",
    created_at: "2026-11-02T00:00:00.000Z",
    original_snapshot: snapshot,
    integrity_hash: hashCapsuleSnapshot(snapshot),
    hash_algorithm: "sha256",
    schema_version: 1,
  };
  globalThis.capsuleRouteTest.existingCapsule = capsule;
  const request = new Request(`https://tidelight.app/api/decision-capsules/${capsule.id}?download=1`);
  const response = await verifyRoute.GET(request, { params: Promise.resolve({ id: capsule.id }) });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("content-disposition"), `attachment; filename="tidelight-decision-capsule-${capsule.id}.json"`);
  assert.deepEqual(await response.json(), { capsule, integrity: "valid" });

  globalThis.capsuleRouteTest.user = null;
  globalThis.flowTest.user = null;
  const unauthorized = await verifyRoute.GET(request, { params: Promise.resolve({ id: capsule.id }) });
  assert.equal(unauthorized.status, 401);
  globalThis.capsuleRouteTest.user = { id: "test-owner" };
  globalThis.flowTest.user = globalThis.capsuleRouteTest.user;
  globalThis.capsuleRouteTest.existingCapsule = { ...capsule, integrity_hash: "0".repeat(64) };
  const tampered = await verifyRoute.GET(request, { params: Promise.resolve({ id: capsule.id }) });
  assert.equal(tampered.status, 409);
  assert.equal(tampered.headers.has("content-disposition"), false);
  globalThis.capsuleRouteTest.existingCapsule = null;
});
