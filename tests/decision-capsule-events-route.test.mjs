import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const owner = "10000000-0000-4000-8000-000000000001";
const capsuleId = "e475bd46-5035-4ae5-9f19-e2959a4f0734";
const idempotencyKey = "0475bd46-5035-4ae5-9f19-e2959a4f0734";
globalThis.flowTest = { user: { id: owner }, admin: null };

const fixture = new URL("./fixtures/research-flow-integration-mocks.mjs", import.meta.url).href;
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (["next/server", "@/lib/supabase/admin", "@/lib/supabase/auth-user"].includes(specifier)) return { url: fixture, shortCircuit: true };
  if (specifier === "@/lib/decision-capsules") return { url: new URL("../lib/decision-capsules.ts", import.meta.url).href, shortCircuit: true };
  if (specifier === "@/lib/decision-capsule-events") return { url: new URL("../lib/decision-capsule-events.ts", import.meta.url).href, shortCircuit: true };
  if (specifier === "./decision-capsules") return { url: new URL("../lib/decision-capsules.ts", import.meta.url).href, shortCircuit: true };
  return nextResolve(specifier, context);
} });
const { hashCapsuleSnapshot } = await import("../lib/decision-capsules.ts");
const helpers = await import("../lib/decision-capsule-events.ts");
const route = await import("../app/api/decision-capsules/[id]/events/route.ts");
hooks.deregister();

const snapshot = { schemaVersion: 1, research: { question: "NVDA event fixture" }, sources: [], evidence: [] };
const capsule = {
  id: capsuleId, user_id: owner, schema_version: 1, original_snapshot: snapshot,
  integrity_hash: hashCapsuleSnapshot(snapshot), hash_algorithm: "sha256",
};
let rows = [];
let rpcCalls = [];
let lookupFailure = false;

function installAdmin() {
  globalThis.flowTest.admin = {
    from(table) {
      const filters = {};
      return {
        select() { return this; },
        eq(column, value) { filters[column] = value; return this; },
        order() { return this; },
        limit() { return this; },
        maybeSingle() { return Promise.resolve({ data: lookupFailure ? null : capsule.id === filters.id && capsule.user_id === filters.user_id ? capsule : null, error: lookupFailure ? { message: "lookup failed" } : null }); },
        then(resolve, reject) {
          return Promise.resolve({ data: table === "decision_capsule_events" ? rows : [], error: null }).then(resolve, reject);
        },
      };
    },
    async rpc(name, args) {
      rpcCalls.push({ name, args });
      if (name !== "append_decision_capsule_event") return { error: { code: "unknown_rpc" } };
      rows.push({
        id: args.p_event_id, capsule_id: args.p_capsule_id, user_id: owner,
        sequence: args.p_sequence, event_type: args.p_event_type, idempotency_key: args.p_idempotency_key,
        forecast_event_id: args.p_forecast_event_id, payload: args.p_payload,
        previous_hash: args.p_previous_hash, integrity_hash: args.p_integrity_hash,
        created_at: args.p_created_at,
      });
      return { data: {}, error: null };
    },
  };
}
function reset() { rows = []; rpcCalls = []; lookupFailure = false; globalThis.flowTest.user = { id: owner }; installAdmin(); }
function request(body, id = capsuleId) {
  return new Request(`https://tidelight.app/api/decision-capsules/${id}/events`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
}
function forecast(key = "0475bd46-5035-4ae5-9f19-e2959a4f0734") {
  return { idempotencyKey: key, type: "forecast", payload: {
    instrument: { type: "us_equity", symbol: "NVDA" }, referencePrice: 100,
    referenceSourceUrl: "https://prices.example/nvda", referenceSourceTimestamp: new Date().toISOString(),
    direction: "up", thresholdPercent: 5, horizonAt: new Date(Date.now() + 86_400_000).toISOString(), probability: 0.7,
  } };
}
async function withDateNow(timestamp, callback) {
  const NativeDate = globalThis.Date;
  globalThis.Date = class extends NativeDate {
    static now() { return timestamp; }
    constructor(...args) { super(...(args.length ? args : [timestamp])); }
  };
  try { return await callback(); } finally { globalThis.Date = NativeDate; }
}

test("private history reads and writes require the capsule owner", async () => {
  reset();
  globalThis.flowTest.user = null;
  const unauthorized = await route.POST(request(forecast()), { params: Promise.resolve({ id: capsuleId }) });
  assert.equal(unauthorized.status, 401);
  globalThis.flowTest.user = { id: owner };
  lookupFailure = true;
  const unavailable = await route.GET(new Request(`https://tidelight.app/api/decision-capsules/${capsuleId}/events`), { params: Promise.resolve({ id: capsuleId }) });
  assert.equal(unavailable.status, 503);
  lookupFailure = false;
  const hidden = await route.GET(new Request(`https://tidelight.app/api/decision-capsules/${capsuleId}/events`), { params: Promise.resolve({ id: "f475bd46-5035-4ae5-9f19-e2959a4f0734" }) });
  assert.equal(hidden.status, 404);
});

test("forecast append is anchored to the original capsule and retry is idempotent", async () => {
  reset();
  const body = forecast();
  const first = await route.POST(request(body), { params: Promise.resolve({ id: capsuleId }) });
  assert.equal(first.status, 201);
  const saved = await first.json();
  assert.equal(saved.event.previousHash, capsule.integrity_hash);
  assert.equal(saved.event.sequence, 1);
  assert.equal(rpcCalls.length, 1);
  const retry = await route.POST(request(body), { params: Promise.resolve({ id: capsuleId }) });
  assert.equal(retry.status, 200);
  assert.deepEqual((await retry.json()).event, saved.event);
  assert.equal(rpcCalls.length, 1);
  const read = await route.GET(new Request(`https://tidelight.app/api/decision-capsules/${capsuleId}/events`), { params: Promise.resolve({ id: capsuleId }) });
  assert.equal(read.status, 200);
  assert.equal((await read.json()).integrity, "valid");
});

test("normalizes UUIDs before hashing and permits an identical retry after its horizon", async () => {
  reset();
  const now = Date.now();
  const requestBody = forecast(idempotencyKey.toUpperCase());
  requestBody.payload.horizonAt = new Date(now + 1_000).toISOString();
  const firstRequest = request(requestBody, capsuleId.toUpperCase());
  const first = await withDateNow(now, () => route.POST(firstRequest, { params: Promise.resolve({ id: capsuleId.toUpperCase() }) }));
  assert.equal(first.status, 201);
  assert.equal(rpcCalls[0].args.p_capsule_id, capsuleId);
  assert.equal(rpcCalls[0].args.p_idempotency_key, idempotencyKey);
  const retry = await withDateNow(now + 2_000, () => route.POST(request(requestBody, capsuleId.toUpperCase()), { params: Promise.resolve({ id: capsuleId.toUpperCase() }) }));
  assert.equal(retry.status, 200);
  assert.equal(rpcCalls.length, 1);
  const read = await route.GET(new Request(`https://tidelight.app/api/decision-capsules/${capsuleId.toUpperCase()}/events`), { params: Promise.resolve({ id: capsuleId.toUpperCase() }) });
  assert.equal(read.status, 200);
  assert.equal((await read.json()).integrity, "valid");
});

test("an outcome requires a same-capsule forecast and cannot precede its horizon", async () => {
  reset();
  const wrong = await route.POST(request({ idempotencyKey: "1475bd46-5035-4ae5-9f19-e2959a4f0734", type: "outcome", payload: {
    forecastEventId: "d475bd46-5035-4ae5-9f19-e2959a4f0734", observedPrice: 101,
    observedAt: new Date(Date.now() - 1_000).toISOString(), sourceUrl: "https://prices.example", sourceTimestamp: new Date(Date.now() - 1_000).toISOString(),
  } }), { params: Promise.resolve({ id: capsuleId }) });
  assert.equal(wrong.status, 422);

  await route.POST(request(forecast()), { params: Promise.resolve({ id: capsuleId }) });
  const outcomeBody = { idempotencyKey: "1475bd46-5035-4ae5-9f19-e2959a4f0734", type: "outcome", payload: {
    forecastEventId: rows[0].id, observedPrice: 106, observedAt: new Date(Date.now() - 1_000).toISOString(),
    sourceUrl: "https://prices.example/nvda", sourceTimestamp: new Date(Date.now() - 1_000).toISOString(),
  } };
  const early = await route.POST(request(outcomeBody), { params: Promise.resolve({ id: capsuleId }) });
  assert.equal(early.status, 422);
  assert.equal(rpcCalls.length, 1);
});

test("recorded outcomes are calculated on the server and visibly marked as user reported", async () => {
  reset();
  await route.POST(request(forecast()), { params: Promise.resolve({ id: capsuleId }) });
  const outcomeBody = { idempotencyKey: "1475bd46-5035-4ae5-9f19-e2959a4f0734", type: "outcome", payload: {
    forecastEventId: rows[0].id, observedPrice: 106, observedAt: rows[0].payload.horizonAt,
    sourceUrl: "https://prices.example/nvda", sourceTimestamp: rows[0].payload.horizonAt,
  } };
  const requestBody = request(outcomeBody);
  const response = await withDateNow(Date.parse(rows[0].payload.horizonAt) + 1_000, () => route.POST(requestBody, { params: Promise.resolve({ id: capsuleId }) }));
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.event.payload.forecastMet, true);
  assert.ok(Math.abs(body.event.payload.actualReturnPercent - 6) < 1e-12);
  assert.equal(body.event.payload.reportedBy, "user");
  assert.ok(Math.abs(body.event.payload.brierScore - 0.09) < 1e-12);
  assert.equal(helpers.verifyCapsuleEventChain(capsuleId, capsule.integrity_hash, rows).length, 2);
});
