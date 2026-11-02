import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const calls = [];
globalThis.capsuleRouteTest = { user: { id: "test-owner" } };
globalThis.flowTest = { user: globalThis.capsuleRouteTest.user };
globalThis.flowTest.admin = {
  from(table) {
    const query = {
      select() { return this; },
      eq() { return this; },
      order() { return this; },
      limit() { return this; },
      maybeSingle() {
        return Promise.resolve({ data: table === "research_runs" ? {
          id: "d475bd46-5035-4ae5-9f19-e2959a4f0734",
          question: "Macro research with no persisted sources",
          status: "complete",
        } : table === "decision_capsules" ? globalThis.capsuleRouteTest.existingCapsule ?? null : null,
        error: table === "decision_capsules" ? globalThis.capsuleRouteTest.capsuleLookupError ?? null : null });
      },
      insert() { calls.push({ table, operation: "insert" }); return this; },
      then(resolve, reject) {
        return Promise.resolve({ data: [], error: null, count: 0 }).then(resolve, reject);
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
hooks.deregister();

test("capsule creation rejects a completed source-empty run without inserting a capsule", async () => {
  const response = await route.POST(new Request("https://tidelight.app/api/decision-capsules", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ researchRunId: "d475bd46-5035-4ae5-9f19-e2959a4f0734" }),
  }));

  assert.equal(response.status, 422);
  assert.match((await response.json()).error, /at least one persisted research source/i);
  assert.deepEqual(calls, []);
});

test("capsule retries return the verified saved capsule before requiring source rows", async () => {
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
