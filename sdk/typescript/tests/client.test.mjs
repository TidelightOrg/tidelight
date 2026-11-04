import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { getPublicDecisionCapsule, TidelightApiError, TidelightClient, verifyPublicDecisionCapsule } from "../dist/index.js";

const key = `tl_test_${"a".repeat(43)}`;
const jobId = "01234567-89ab-4cde-8fab-0123456789ab";

test("filters market instruments by normalized underlying ticker", async () => {
  let requestUrl = "";
  const client = new TidelightClient({ apiKey: key, fetch: async url => {
    requestUrl = String(url);
    return Response.json({ data: [], next_cursor: null, generated_at: 1, request_id: "market-filter" });
  } });
  await client.listTokenizedEquities({ limit: 1, underlyingTicker: "aapl" });
  assert.match(requestUrl, /underlying_ticker=AAPL/);
  await assert.rejects(client.listTokenizedEquities({ underlyingTicker: "AAPL?" }), TypeError);
});

test("starts, polls, and cancels an asynchronous research job", async () => {
  const calls = [];
  const client = new TidelightClient({ apiKey: key, fetch: async (url, init) => {
    calls.push({ url: String(url), init });
    const method = init?.method ?? "GET";
    const body = method === "POST" ? { job_id: jobId, status: "queued", duplicate: false, request_id: "r1" }
      : method === "DELETE" ? { job_id: jobId, status: "cancelled", request_id: "r3" }
        : { job_id: jobId, ticker: "NVDA", status: "complete", attempts: 1, max_attempts: 3, result: { type: "company_snapshot" }, error: null, created_at: "2026-01-01T00:00:00Z", started_at: null, completed_at: "2026-01-01T00:01:00Z", retry_at: null, request_id: "r2" };
    return Response.json(body, { status: method === "POST" ? 202 : method === "DELETE" ? 202 : 200 });
  } });
  const accepted = await client.startCompanyResearch("NVDA", "job-key-0001");
  assert.equal(accepted.job_id, jobId);
  assert.equal(calls[0].init.headers["Idempotency-Key"], "job-key-0001");
  const result = await client.waitForResearchJob(jobId, { intervalMs: 250, timeoutMs: 1000 });
  assert.equal(result.status, "complete");
  assert.equal(result.result.type, "company_snapshot");
  assert.equal((await client.cancelResearchJob(jobId)).status, "cancelled");
});

test("rejects malformed research input before making a request", async () => {
  const client = new TidelightClient({ apiKey: key, fetch: async () => assert.fail("network should not run") });
  await assert.rejects(client.startCompanyResearch("NVDA", "short"), TypeError);
  await assert.rejects(client.getResearchJob("../secrets"), TypeError);
});

test("fetches and verifies a public capsule without sending the API key", async () => {
  const snapshot = { schemaVersion: 1, integrityScope: "disclosed_public_projection", research: { question: "NVDA?", createdAt: "2026-11-01T00:00:00Z" } };
  const canonical = value => Array.isArray(value) ? `[${value.map(canonical).join(",")}]` : value && typeof value === "object" ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}` : JSON.stringify(value);
  const integrityHash = createHash("sha256").update(canonical(snapshot), "utf8").digest("hex");
  const calls = [];
  const client = new TidelightClient({ apiKey: key, fetch: async (url, init) => {
    calls.push({ url: String(url), init });
    return Response.json({ schemaVersion: 1, publishedAt: "2026-11-01T00:00:00Z", snapshot, integrityHash, hashAlgorithm: "sha256", integrity: "valid" });
  } });
  const result = await client.getPublicDecisionCapsule("a".repeat(43));
  assert.equal(result.snapshot.research.question, "NVDA?");
  assert.equal(calls[0].url, `https://tidelight.app/api/decision-capsules/public/${"a".repeat(43)}`);
  assert.equal(calls[0].init.headers.Authorization, undefined);
  await assert.rejects(client.getPublicDecisionCapsule("bad/token"), TypeError);
  const tampered = new TidelightClient({ apiKey: key, fetch: async () => Response.json({ schemaVersion: 1, publishedAt: "2026-11-01T00:00:00Z", snapshot, integrityHash: "0".repeat(64), hashAlgorithm: "sha256", integrity: "valid" }) });
  await assert.rejects(tampered.getPublicDecisionCapsule("b".repeat(43)), error => error instanceof TidelightApiError && error.code === "integrity_verification_failed");
});

test("public capsule retrieval works without constructing an API-key client", async () => {
  const snapshot = { research: { question: "NVDA?" } };
  const canonical = value => Array.isArray(value) ? `[${value.map(canonical).join(",")}]` : value && typeof value === "object" ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}` : JSON.stringify(value);
  const integrityHash = createHash("sha256").update(canonical(snapshot), "utf8").digest("hex");
  let call;
  const publication = await getPublicDecisionCapsule("c".repeat(43), { fetch: async (url, init) => { call = { url: String(url), init }; return Response.json({ schemaVersion: 1, publishedAt: "2026-11-01T00:00:00Z", snapshot, integrityHash, hashAlgorithm: "sha256", integrity: "valid" }); } });
  assert.equal(publication.integrity, "valid");
  assert.equal(call.url, `https://tidelight.app/api/decision-capsules/public/${"c".repeat(43)}`);
  assert.deepEqual(call.init.headers, { Accept: "application/json" });
});

test("already-aborted public capsule requests never call fetch", async () => {
  const controller = new AbortController(); controller.abort(new Error("cancelled by caller"));
  let called = false;
  await assert.rejects(getPublicDecisionCapsule("d".repeat(43), { signal: controller.signal, fetch: async () => { called = true; return Response.json({}); } }), error => error === controller.signal.reason);
  const client = new TidelightClient({ apiKey: key, fetch: async () => { called = true; return Response.json({}); } });
  await assert.rejects(client.getPublicDecisionCapsule("d".repeat(43), { signal: controller.signal }), error => error === controller.signal.reason);
  assert.equal(called, false);
});

test("public capsule digest uses the shared canonical JSON format", () => {
  const snapshot = { z: -0, a: { unicode: "NVIDIA ™", tiny: 1e-7, micro: 1e-6, near: 1.23e20, prob: 0.7, whole: 1.0 }, items: [true, null, 3] };
  assert.equal(verifyPublicDecisionCapsule({ snapshot, hashAlgorithm: "sha256", integrityHash: "d9e3e417a7e61eaeeb90ce493e07e959ee65d4801282f69c559aa8f9bf55dc98" }), true);
});

test("preserves structured API errors", async () => {
  const client = new TidelightClient({ apiKey: key, maxRetries: 0, fetch: async () => Response.json({ error: { code: "insufficient_scope", message: "Missing research scope", request_id: "r4" } }, { status: 403 }) });
  await assert.rejects(client.startCompanyResearch("NVDA", "job-key-0002"), error => error instanceof TidelightApiError && error.code === "insufficient_scope" && error.requestId === "r4");
});

test("manages scoped webhooks and reads delivery history", async () => {
  const calls = [];
  const endpoint = { id: jobId, project_id: "p1", organization_id: "o1", name: "Research", url: "https://example.com/hook", events: ["research.job.completed"], enabled: true, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" };
  const client = new TidelightClient({ apiKey: key, fetch: async (url, init) => {
    calls.push({ url: String(url), init });
    const method = init.method;
    const data = method === "GET" && String(url).endsWith("/deliveries") ? { deliveries: [], request_id: "r5" }
      : method === "GET" ? { endpoints: [endpoint], request_id: "r1" }
        : method === "DELETE" ? { disabled: true, request_id: "r4" }
          : { endpoint, ...(method === "POST" || JSON.parse(init.body).rotate_secret ? { signing_secret: "once-only" } : {}), request_id: method === "POST" ? "r2" : "r3" };
    return Response.json(data, { status: method === "POST" ? 201 : 200 });
  } });
  assert.equal((await client.listWebhooks()).endpoints[0].id, jobId);
  assert.equal((await client.createWebhook({ name: "Research", url: "https://example.com/hook", events: ["research.job.completed"] })).signing_secret, "once-only");
  assert.equal((await client.updateWebhook(jobId, { rotate_secret: true })).signing_secret, "once-only");
  assert.equal((await client.disableWebhook(jobId)).disabled, true);
  assert.deepEqual((await client.listWebhookDeliveries()).deliveries, []);
  assert.deepEqual(calls.map(call => call.init.method), ["GET", "POST", "PATCH", "DELETE", "GET"]);
  assert.ok(calls.every(call => call.init.headers.Authorization === "Bearer " + key));
});

test("rejects unsafe or malformed webhook inputs before network access", async () => {
  const client = new TidelightClient({ apiKey: key, fetch: async () => assert.fail("network should not run") });
  await assert.rejects(client.createWebhook({ name: "x", url: "http://example.com/hook", events: ["research.job.completed"] }), TypeError);
  await assert.rejects(client.createWebhook({ name: "Valid", url: "https://example.com/hook", events: ["unknown.event"] }), TypeError);
  await assert.rejects(client.updateWebhook("bad-id", { enabled: false }), TypeError);
  await assert.rejects(client.updateWebhook(jobId, { rotate_secret: false }), TypeError);
});

test("does not retry webhook mutations without server idempotency support", async () => {
  let calls = 0;
  const client = new TidelightClient({ apiKey: key, maxRetries: 3, fetch: async () => { calls++; return Response.json({ error: { code: "service_unavailable", message: "Try later" } }, { status: 503 }); } });
  await assert.rejects(client.createWebhook({ name: "Research", url: "https://example.com/hook", events: ["research.job.completed"] }), error => error instanceof TidelightApiError && error.code === "service_unavailable");
  assert.equal(calls, 1);
});
