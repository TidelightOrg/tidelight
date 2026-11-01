import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { url: "data:text/javascript,export {};", shortCircuit: true };
  if (specifier === "@/lib/supabase/admin") return { url: "data:text/javascript,export const createAdminClient=()=>globalThis.__providerHealthAdmin();", shortCircuit: true };
  if (specifier === "@/lib/ai-fallback") return { url: "data:text/javascript,export {};", shortCircuit: true };
  return nextResolve(specifier, context);
} });
const health = await import("../lib/provider-health.ts");
hooks.deregister();

const events = (provider, outcome, count = 3, spacingMs = 1000, observedAt = Date.now()) => Array.from({ length: count }, (_, index) => ({ provider, outcome, occurred_at: new Date(observedAt - index * spacingMs).toISOString() }));

test("three consecutive recent failures open a provider circuit", () => {
  const now = Date.now();
  const result = health.classifyProviderRouting(["qwen", "gemini"], events("qwen", "timeout", 3, 1000, now), now);
  assert.equal(result.status, "available");
  assert.deepEqual(result.skippedProviders.map(item => item.provider), ["qwen"]);
  assert.equal(result.skippedProviders[0].consecutiveFailures, 3);
});

test("a cooled-down circuit accepts a recovery probe", () => {
  const now = Date.now();
  const recoveredWindow = events("qwen", "http_error").map(event => ({ ...event, occurred_at: new Date(now - health.PROVIDER_CIRCUIT_COOLDOWN_MS - 1000).toISOString() }));
  assert.deepEqual(health.classifyProviderRouting(["qwen", "gemini"], recoveredWindow, now).skippedProviders, []);
});

test("a success, stale events, and future events prevent false circuit opening", () => {
  const now = Date.now();
  const recent = events("qwen", "http_error");
  recent[0] = { ...recent[0], outcome: "success" };
  assert.deepEqual(health.classifyProviderRouting(["qwen", "gemini"], recent, now).skippedProviders, []);
  assert.deepEqual(health.classifyProviderRouting(["qwen", "gemini"], events("qwen", "http_error", 3, 90_000), now).skippedProviders, []);
  const future = events("qwen", "http_error").map(event => ({ ...event, occurred_at: new Date(now + 60_000).toISOString() }));
  assert.deepEqual(health.classifyProviderRouting(["qwen", "gemini"], future, now).skippedProviders, []);
});

test("all providers open becomes a normal-order half-open probe", () => {
  const now = Date.now();
  const result = health.classifyProviderRouting(["qwen", "gemini"], [...events("qwen", "network_error", 3, 1000, now), ...events("gemini", "timeout", 3, 1000, now)], now);
  assert.equal(result.status, "all_open_probe");
  assert.deepEqual(result.skippedProviders, []);
});

test("provider health reads only a bounded recent window and fails open", async t => {
  const prior = globalThis.__providerHealthAdmin;
  t.after(() => { if (prior === undefined) delete globalThis.__providerHealthAdmin; else globalThis.__providerHealthAdmin = prior; });
  const observed = [];
  const now = Date.now();
  globalThis.__providerHealthAdmin = () => ({ from(table) {
    assert.equal(table, "research_provider_health_events");
    return {
      select(columns) { this.observed = { columns }; observed.push(this.observed); return this; },
      eq(column, value) { this.observed.provider = value; return this; },
      gte(column, value) { this.observed.column = column; this.observed.since = value; return this; },
      order(column, options) { this.observed.order = [column, options.ascending]; return this; },
      limit(value) { this.observed.limit = value; return this; },
      abortSignal(signal) { this.observed.signal = signal; return Promise.resolve({ data: events(this.observed.provider, this.observed.provider === "qwen" ? "http_error" : "success", 3, 1000, now), error: null }); },
    };
  } });
  const result = await health.getProviderRoutingDecision(["qwen", "gemini"], now);
  assert.equal(result.skippedProviders[0].provider, "qwen");
  assert.equal(observed.length, 2);
  assert.deepEqual(observed.map(row => row.provider).sort(), ["gemini", "qwen"]);
  for (const row of observed) {
    assert.equal(row.columns, "provider,outcome,occurred_at");
    assert.equal(row.column, "occurred_at");
    assert.equal(row.order[0], "occurred_at");
    assert.equal(row.limit, 10);
    assert.equal(Date.parse(row.since), now - health.PROVIDER_CIRCUIT_FAILURE_WINDOW_MS);
    assert.equal(row.signal.aborted, false);
  }

  globalThis.__providerHealthAdmin = () => { throw new Error("unavailable"); };
  assert.deepEqual(await health.getProviderRoutingDecision(["qwen", "gemini"], now), { status: "unavailable", skippedProviders: [] });
});

test("recent per-provider reads retain Qwen failures behind a busy Gemini event stream", async t => {
  const prior = globalThis.__providerHealthAdmin;
  t.after(() => { if (prior === undefined) delete globalThis.__providerHealthAdmin; else globalThis.__providerHealthAdmin = prior; });
  const now = Date.now();
  globalThis.__providerHealthAdmin = () => ({ from() {
    return {
      select() { return this; }, eq(_column, provider) { this.provider = provider; return this; }, gte() { return this; }, order() { return this; }, limit() { return this; },
      abortSignal() { return Promise.resolve({ data: this.provider === "qwen" ? events("qwen", "timeout", 3, 1000, now) : events("gemini", "success", 10, 1000, now), error: null }); },
    };
  } });
  const result = await health.getProviderRoutingDecision(["qwen", "gemini"], now);
  assert.deepEqual(result.skippedProviders.map(item => item.provider), ["qwen"]);
});

test("provider telemetry persists attempt time instead of write-batch time", async t => {
  const prior = globalThis.__providerHealthAdmin;
  t.after(() => { if (prior === undefined) delete globalThis.__providerHealthAdmin; else globalThis.__providerHealthAdmin = prior; });
  let inserted;
  globalThis.__providerHealthAdmin = () => ({ from(table) {
    assert.equal(table, "research_provider_health_events");
    return { insert(rows) { inserted = rows; return { abortSignal: () => Promise.resolve({ error: null }) }; } };
  } });
  const occurredAt = "2026-10-31T21:15:00.000Z";
  await health.recordProviderHealth([{ provider: "qwen", model: "qwen-test", attempt: 1, outcome: "timeout", occurredAt, durationMs: 500, httpStatus: undefined }]);
  assert.equal(inserted[0].occurred_at, occurredAt);
  assert.equal(inserted[0].duration_ms, 500);
  assert.equal(JSON.stringify(inserted).includes("prompt"), false);
});
