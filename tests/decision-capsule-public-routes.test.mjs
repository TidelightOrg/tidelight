import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const owner = "10000000-0000-4000-8000-000000000001";
const capsuleId = "e475bd46-5035-4ae5-9f19-e2959a4f0734";
globalThis.flowTest = { user: { id: owner }, admin: null, rateLimitAllowed: true, rateLimitCalls: [] };
const fixture = new URL("./fixtures/research-flow-integration-mocks.mjs", import.meta.url).href;
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "next/server" || specifier === "@/lib/supabase/admin" || specifier === "@/lib/supabase/auth-user" || specifier === "@/lib/tic/oauth-rate-limit") return { url: fixture, shortCircuit: true };
  if (specifier === "@/lib/decision-capsules") return { url: new URL("../lib/decision-capsules.ts", import.meta.url).href, shortCircuit: true };
  if (specifier === "@/lib/decision-capsule-events") return { url: new URL("../lib/decision-capsule-events.ts", import.meta.url).href, shortCircuit: true };
  if (specifier === "@/lib/decision-capsule-public") return { url: new URL("../lib/decision-capsule-public.ts", import.meta.url).href, shortCircuit: true };
  if (specifier === "./decision-capsules") return { url: new URL("../lib/decision-capsules.ts", import.meta.url).href, shortCircuit: true };
  if (specifier === "./decision-capsule-public") return { url: new URL("../lib/decision-capsule-public.ts", import.meta.url).href, shortCircuit: true };
  if (specifier === "./instrument-identity") return { url: new URL("../lib/instrument-identity.ts", import.meta.url).href, shortCircuit: true };
  return nextResolve(specifier, context);
} });
const cryptoUtils = await import("node:crypto");
const capsuleHelpers = await import("../lib/decision-capsules.ts");
const eventHelpers = await import("../lib/decision-capsule-events.ts");
const publicHelpers = await import("../lib/decision-capsule-public.ts");
const shareRoute = await import("../app/api/decision-capsules/[id]/share/route.ts");
const publicRoute = await import("../app/api/decision-capsules/public/[token]/route.ts");
hooks.deregister();

const originalSnapshot = {
  schemaVersion: 1, origin: { type: "research_run", id: "80000000-0000-4000-8000-000000000001" },
  research: { question: "Review NVDA", status: "complete", createdAt: "2026-11-01T00:00:00.000Z", completedAt: null, model: "fixture", summary: { stance: "mixed" } },
  sources: [{ id: "70000000-0000-4000-8000-000000000001", url: "https://example.com/filing", title: "Filing", publisher: "Issuer", publishedAt: null, retrievedAt: "2026-11-01T00:00:00.000Z", sourceType: "primary", excerpt: "Public excerpt", contentHash: "never publish contentHash" }],
  evidence: [{ sourceId: "70000000-0000-4000-8000-000000000001", claim: "Revenue improved", supportingQuote: "Revenue grew", stance: "supporting", confidence: 0.7, recordedAt: "2026-11-01T00:00:00.000Z", quoteMatchStatus: "exact", claimSupportStatus: "supported", passageStartCodepoint: 1, passageEndCodepoint: 8 }],
};
const anchorHash = capsuleHelpers.hashCapsuleSnapshot(originalSnapshot);
const capsule = { id: capsuleId, user_id: owner, schema_version: 1, original_snapshot: originalSnapshot, integrity_hash: anchorHash, hash_algorithm: "sha256" };
const unsigned = {
  id: "f475bd46-5035-4ae5-9f19-e2959a4f0734", capsuleId, sequence: 1, type: "forecast",
  idempotencyKey: "0475bd46-5035-4ae5-9f19-e2959a4f0734", forecastEventId: null,
  payload: { instrument: { type: "us_equity", symbol: "NVDA" }, referencePrice: 100, direction: "up", thresholdPercent: 5, horizonAt: "2026-11-05T00:00:00.000Z" },
  previousHash: anchorHash, createdAt: "2026-11-01T00:02:00.000Z",
};
const eventHash = eventHelpers.hashCapsuleEvent(unsigned);
const eventRows = [{ id: unsigned.id, capsule_id: capsuleId, user_id: owner, sequence: 1, event_type: "forecast", idempotency_key: unsigned.idempotencyKey, forecast_event_id: null, payload: unsigned.payload, previous_hash: unsigned.previousHash, integrity_hash: eventHash, created_at: unsigned.createdAt }];
const firstEventRow = structuredClone(eventRows[0]);
let publication = null;
let failCapsuleLookup = false;

function appendFixtureEvent() {
  const previous = eventRows.at(-1);
  const next = {
    id: "a475bd46-5035-4ae5-9f19-e2959a4f0734", capsuleId, sequence: previous.sequence + 1, type: "forecast",
    idempotencyKey: "b475bd46-5035-4ae5-9f19-e2959a4f0734", forecastEventId: null,
    payload: { instrument: { type: "us_equity", symbol: "NVDA" }, referencePrice: 101, direction: "up", thresholdPercent: 4, horizonAt: "2026-11-06T00:00:00.000Z" },
    previousHash: previous.integrity_hash, createdAt: "2026-11-01T00:03:00.000Z",
  };
  eventRows.push({ id: next.id, capsule_id: capsuleId, user_id: owner, sequence: next.sequence, event_type: next.type, idempotency_key: next.idempotencyKey, forecast_event_id: null, payload: next.payload, previous_hash: next.previousHash, integrity_hash: eventHelpers.hashCapsuleEvent(next), created_at: next.createdAt });
}

function installAdmin() {
  globalThis.flowTest.admin = {
    rpc(name, args) {
      if (name !== "publish_decision_capsule_publication") return Promise.resolve({ data: null, error: { code: "42883" } });
      globalThis.flowTest.beforePublicationRpc?.();
      globalThis.flowTest.beforePublicationRpc = null;
      const head = eventRows.at(-1);
      if ((head?.sequence ?? 0) !== args.p_expected_history_sequence || (head?.integrity_hash ?? capsule.integrity_hash) !== args.p_expected_history_hash) {
        return Promise.resolve({ data: null, error: { code: "40001", message: "capsule_event_head_changed" } });
      }
      if (publication && publication.revoked_at === null) return Promise.resolve({ data: null, error: { code: "23505" } });
      publication = { capsule_id: args.p_capsule_id, user_id: args.p_user_id, token_hash: args.p_token_hash, schema_version: 1, public_snapshot: args.p_public_snapshot, integrity_hash: args.p_integrity_hash, created_at: "2026-11-04T08:00:00.000Z", revoked_at: null };
      return Promise.resolve({ data: { created_at: publication.created_at }, error: null });
    },
    from(table) {
      const filters = {}; let operation = "select"; let updateValues; let insertValues;
      const query = {
        select() { return this; },
        eq(column, value) { filters[column] = value; return this; },
        is(column, value) { filters[column] = value; return this; },
        order() { return this; },
        limit() { return this; },
        update(value) { operation = "update"; updateValues = value; return this; },
        insert(value) { operation = "insert"; insertValues = value; return this; },
        maybeSingle() {
          if (table === "decision_capsules") return Promise.resolve({ data: failCapsuleLookup || filters.user_id !== owner ? null : capsule, error: failCapsuleLookup ? { message: "lookup failed" } : null });
          if (table === "decision_capsule_publications") {
            if (operation === "insert") {
              if (publication && publication.revoked_at === null) return Promise.resolve({ data: null, error: { code: "23505" } });
              publication = { ...insertValues, created_at: "2026-11-04T08:00:00.000Z", revoked_at: null };
              return Promise.resolve({ data: { created_at: publication.created_at }, error: null });
            }
            if (operation === "update") {
              if (!publication || publication.capsule_id !== filters.capsule_id || publication.user_id !== filters.user_id || publication.revoked_at !== null) return Promise.resolve({ data: null, error: null });
              Object.assign(publication, updateValues); return Promise.resolve({ data: { id: "share" }, error: null });
            }
            if (filters.token_hash) return Promise.resolve({ data: publication?.token_hash === filters.token_hash ? publication : null, error: null });
            return Promise.resolve({ data: publication?.capsule_id === filters.capsule_id && publication?.user_id === filters.user_id && publication?.revoked_at === filters.revoked_at ? publication : null, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        },
        then(resolve, reject) {
          const data = table === "decision_capsule_events" ? eventRows : [];
          return Promise.resolve({ data, error: null }).then(resolve, reject);
        },
      };
      return query;
    },
  };
}
function reset() { publication = null; failCapsuleLookup = false; capsule.original_snapshot = structuredClone(originalSnapshot); capsule.integrity_hash = anchorHash; eventRows.splice(0, eventRows.length, structuredClone(firstEventRow)); globalThis.flowTest.user = { id: owner }; globalThis.flowTest.adminUnavailable = false; globalThis.flowTest.rateLimitAllowed = true; globalThis.flowTest.rateLimitError = false; globalThis.flowTest.rateLimitCalls = []; globalThis.flowTest.beforePublicationRpc = null; installAdmin(); }
function params(id = capsuleId) { return { params: Promise.resolve({ id }) }; }
function post(body, id = capsuleId) { return new Request(`https://tidelight.app/api/decision-capsules/${id}/share`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); }

test("publishing requires an owner, a previewed selection, and an unchanged history confirmation", async () => {
  reset();
  assert.equal(capsuleHelpers.capsuleHashMatches(capsule.original_snapshot, capsule.integrity_hash), true);
  globalThis.flowTest.user = null;
  assert.equal((await shareRoute.POST(post({ action: "preview", selection: { research: true, evidence: false, events: true } }), params())).status, 401);
  globalThis.flowTest.user = { id: "20000000-0000-4000-8000-000000000002" };
  assert.equal((await shareRoute.POST(post({ action: "preview", selection: { research: true, evidence: false, events: true } }), params())).status, 404);
  globalThis.flowTest.user = { id: owner };
  const selection = { research: true, evidence: true, events: true };
  const previewResponse = await shareRoute.POST(post({ action: "preview", selection }), params());
  const preview = await previewResponse.json();
  assert.equal(previewResponse.status, 200, JSON.stringify(preview));
  assert.equal(preview.preview.research.question, "Review NVDA");
  assert.equal(preview.preview.evidence.sources[0].url, "https://example.com/filing");
  assert.equal("origin" in preview.preview, false);
  assert.equal(JSON.stringify(preview.preview).includes(owner), false);
  assert.equal(JSON.stringify(preview.preview).includes("contentHash"), false);
  const stale = await shareRoute.POST(post({ action: "publish", selection, confirmed: true, expectedConfirmationHash: "0".repeat(64) }), params());
  assert.equal(stale.status, 409);
  assert.equal(publication, null);
  const published = await shareRoute.POST(post({ action: "publish", selection, confirmed: true, expectedConfirmationHash: preview.confirmationHash }), params());
  assert.equal(published.status, 201);
  const result = await published.json();
  assert.match(result.url, /^\/api\/decision-capsules\/public\/[A-Za-z0-9_-]{43}$/);
  assert.equal(publication.token_hash, publicHelpers.hashPublicationToken(result.url.split("/").at(-1)));
  assert.equal(JSON.stringify(publication).includes(result.url.split("/").at(-1)), false);
});

test("preview refuses any projection that would fail public snapshot verification", async () => {
  reset();
  capsule.original_snapshot = structuredClone(originalSnapshot);
  capsule.original_snapshot.research.completedAt = "not-a-date";
  capsule.integrity_hash = capsuleHelpers.hashCapsuleSnapshot(capsule.original_snapshot);
  eventRows.splice(0);
  const response = await shareRoute.POST(post({ action: "preview", selection: { research: true, evidence: false, events: false } }), params());
  assert.equal(response.status, 422);
  assert.equal(publication, null);
});

test("a private event invalidates a preview even when event details are excluded", async () => {
  reset();
  const selection = { research: true, evidence: false, events: false };
  const preview = await (await shareRoute.POST(post({ action: "preview", selection }), params())).json();
  appendFixtureEvent();
  const response = await shareRoute.POST(post({ action: "publish", selection, confirmed: true, expectedConfirmationHash: preview.confirmationHash }), params());
  assert.equal(response.status, 409);
  assert.equal(publication, null);
});

test("the atomic database check rejects a history append racing publication", async () => {
  reset();
  const selection = { research: true, evidence: false, events: false };
  const preview = await (await shareRoute.POST(post({ action: "preview", selection }), params())).json();
  globalThis.flowTest.beforePublicationRpc = appendFixtureEvent;
  const response = await shareRoute.POST(post({ action: "publish", selection, confirmed: true, expectedConfirmationHash: preview.confirmationHash }), params());
  assert.equal(response.status, 409);
  assert.equal(publication, null);
});

test("public link serves only the redacted immutable projection and verifies its hash", async () => {
  reset();
  const selection = { research: false, evidence: true, events: true };
  const preview = await (await shareRoute.POST(post({ action: "preview", selection }), params())).json();
  const response = await shareRoute.POST(post({ action: "publish", selection, confirmed: true, expectedConfirmationHash: preview.confirmationHash }), params());
  const link = (await response.json()).url;
  const token = link.split("/").at(-1);
  const publicResponse = await publicRoute.GET(new Request(`https://tidelight.app${link}`), { params: Promise.resolve({ token }) });
  assert.equal(publicResponse.status, 200);
  assert.equal(publicResponse.headers.get("cache-control"), "no-store");
  const body = await publicResponse.json();
  assert.equal(body.integrity, "valid");
  assert.equal(capsuleHelpers.capsuleHashMatches(body.snapshot, body.integrityHash), true);
  assert.equal("research" in body.snapshot, false);
  assert.equal("origin" in body.snapshot, false);
  assert.equal(JSON.stringify(body).includes(owner), false);
  assert.equal(JSON.stringify(body).includes(capsuleId), false);
  assert.equal(JSON.stringify(body).includes("contentHash"), false);
  assert.equal(JSON.stringify(body).includes("idempotencyKey"), false);
  assert.equal((await publicRoute.GET(new Request("https://tidelight.app/api"), { params: Promise.resolve({ token: "bad" }) })).status, 404);
});

test("public reads enforce a per-IP rate gate before database access", async () => {
  reset();
  const selection = { research: true, evidence: false, events: false };
  const preview = await (await shareRoute.POST(post({ action: "preview", selection }), params())).json();
  const result = await (await shareRoute.POST(post({ action: "publish", selection, confirmed: true, expectedConfirmationHash: preview.confirmationHash }), params())).json();
  const token = result.url.split("/").at(-1);
  globalThis.flowTest.adminUnavailable = true;
  globalThis.flowTest.rateLimitAllowed = false;
  const limited = await publicRoute.GET(new Request("https://tidelight.app"), { params: Promise.resolve({ token }) });
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "60");
  assert.equal(globalThis.flowTest.rateLimitCalls.at(-1)[1], "public_capsule");
  globalThis.flowTest.rateLimitAllowed = true;
  globalThis.flowTest.rateLimitError = true;
  assert.equal((await publicRoute.GET(new Request("https://tidelight.app"), { params: Promise.resolve({ token }) })).status, 503);
  assert.equal((await publicRoute.GET(new Request("https://tidelight.app"), { params: Promise.resolve({ token: "bad" }) })).status, 404);
});

test("owner can revoke a public bearer link and revocation takes effect on the next read", async () => {
  reset();
  const selection = { research: true, evidence: false, events: true };
  const preview = await (await shareRoute.POST(post({ action: "preview", selection }), params())).json();
  const result = await (await shareRoute.POST(post({ action: "publish", selection, confirmed: true, expectedConfirmationHash: preview.confirmationHash }), params())).json();
  const token = result.url.split("/").at(-1);
  const state = await shareRoute.GET(new Request("https://tidelight.app"), params());
  assert.equal((await state.json()).published, true);
  const revoke = await shareRoute.POST(post({ action: "revoke" }), params());
  assert.equal(revoke.status, 200);
  assert.equal((await publicRoute.GET(new Request("https://tidelight.app"), { params: Promise.resolve({ token }) })).status, 404);
  assert.equal((await (await shareRoute.GET(new Request("https://tidelight.app"), params())).json()).published, false);
});

test("public retrieval fails closed for missing or tampered publications", async () => {
  reset();
  const token = cryptoUtils.randomBytes(32).toString("base64url");
  const tokenHash = publicHelpers.hashPublicationToken(token);
  publication = { token_hash: tokenHash, public_snapshot: { schemaVersion: 1 }, integrity_hash: "0".repeat(64), schema_version: 1, created_at: "2026-11-04T08:00:00.000Z", revoked_at: null };
  const response = await publicRoute.GET(new Request("https://tidelight.app"), { params: Promise.resolve({ token }) });
  assert.equal(response.status, 409);
  globalThis.flowTest.user = null;
  assert.equal((await shareRoute.GET(new Request("https://tidelight.app"), params())).status, 401);
});
