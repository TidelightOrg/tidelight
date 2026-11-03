import test from "node:test";
import assert from "node:assert/strict";
import { createDecisionCapsule } from "../lib/decision-capsule-client.ts";

const capsule = {
  id: "10000000-0000-4000-8000-000000000001",
  created_at: "2026-11-03T10:00:00.000Z",
  original_snapshot: { question: "Review NVDA" },
  integrity_hash: "A".repeat(64),
  hash_algorithm: "sha256",
  schema_version: 1,
};

test("creates a private capsule from a saved run and accepts only a verified integrity receipt", async () => {
  let request;
  const receipt = await createDecisionCapsule(capsule.id, async (url, init) => {
    request = { url, init };
    return new Response(JSON.stringify({ capsule, integrity: "valid" }), { status: 201, headers: { "content-type": "application/json" } });
  });

  assert.equal(request.url, "/api/decision-capsules");
  assert.equal(request.init.method, "POST");
  assert.equal(request.init.cache, "no-store");
  assert.deepEqual(JSON.parse(request.init.body), { researchRunId: capsule.id });
  assert.deepEqual(receipt, {
    id: capsule.id,
    createdAt: capsule.created_at,
    integrityHash: "a".repeat(64),
    hashAlgorithm: "sha256",
    schemaVersion: 1,
  });
});

test("preserves private API failures as actionable errors", async () => {
  await assert.rejects(
    createDecisionCapsule(capsule.id, async () => new Response(JSON.stringify({ error: "Sign in to save a private decision capsule." }), { status: 401 })),
    /Sign in to save a private decision capsule/,
  );
});

test("rejects success responses without valid capsule integrity metadata", async () => {
  await assert.rejects(
    createDecisionCapsule(capsule.id, async () => new Response(JSON.stringify({ capsule: { ...capsule, integrity_hash: "invalid" }, integrity: "valid" }), { status: 201 })),
    /invalid integrity receipt/,
  );
});
