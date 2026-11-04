import test from "node:test";
import assert from "node:assert/strict";
import { appendDecisionCapsuleEvent, createDecisionCapsule, getDecisionCapsuleEvents } from "../lib/decision-capsule-client.ts";

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

test("rejects malformed and impossible capsule timestamps", async () => {
  for (const created_at of ["November 3, 2026", "2026-02-30T10:00:00Z", "2026-11-03T25:00:00.000Z", "2026-11-03T10:00:00"]) {
    await assert.rejects(
      createDecisionCapsule(capsule.id, async () => new Response(JSON.stringify({ capsule: { ...capsule, created_at }, integrity: "valid" }), { status: 201 })),
      /invalid integrity receipt/,
    );
  }
});

test("loads only a bounded event list returned with a verified chain status", async () => {
  const event = { id: capsule.id, sequence: 1, type: "forecast", createdAt: capsule.created_at, payload: { direction: "up" } };
  let request;
  const events = await getDecisionCapsuleEvents(capsule.id, async (url, init) => {
    request = { url, init };
    return new Response(JSON.stringify({ capsuleId: capsule.id, events: [event], integrity: "valid" }), { status: 200 });
  });
  assert.equal(request.url, `/api/decision-capsules/${capsule.id}/events`);
  assert.equal(request.init.cache, "no-store");
  assert.deepEqual(events, [event]);
  await assert.rejects(getDecisionCapsuleEvents(capsule.id, async () => new Response(JSON.stringify({ events: [event], integrity: "invalid" }), { status: 200 })), /did not pass verification/);
});

test("appends typed capsule history events without caching and preserves server errors", async () => {
  const event = { id: capsule.id, sequence: 1, type: "forecast", createdAt: capsule.created_at, payload: { direction: "up" } };
  let request;
  const saved = await appendDecisionCapsuleEvent(capsule.id, { idempotencyKey: capsule.id, type: "forecast", payload: event.payload }, async (url, init) => {
    request = { url, init };
    return new Response(JSON.stringify({ event, integrity: "valid" }), { status: 201 });
  });
  assert.equal(request.init.method, "POST");
  assert.equal(request.init.cache, "no-store");
  assert.deepEqual(saved, event);
  await assert.rejects(appendDecisionCapsuleEvent(capsule.id, {}, async () => new Response(JSON.stringify({ error: "Capsule event limit reached." }), { status: 409 })), /event limit reached/);
});
