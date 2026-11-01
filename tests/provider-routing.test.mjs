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

const events = (provider, outcome, count = 3, spacingMs = 1000) => Array.from({ length: count }, (_, index) => ({ provider, outcome, occurred_at: new Date(Date.now() - index * spacingMs).toISOString() }));

test("three consecutive recent failures open a provider circuit", () => {
  const now = Date.now();
  const result = health.classifyProviderRouting(["qwen", "gemini"], events("qwen", "timeout"), now);
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
  const result = health.classifyProviderRouting(["qwen", "gemini"], [...events("qwen", "network_error"), ...events("gemini", "timeout")], now);
  assert.equal(result.status, "all_open_probe");
  assert.deepEqual(result.skippedProviders, []);
});

test("provider health reads only a bounded recent window and fails open", async t => {
  const prior = globalThis.__providerHealthAdmin;
  t.after(() => { if (prior === undefined) delete globalThis.__providerHealthAdmin; else globalThis.__providerHealthAdmin = prior; });
  let observed = {};
  globalThis.__providerHealthAdmin = () => ({ from(table) {
    assert.equal(table, "research_provider_health_events");
    return {
      select(columns) { observed.columns = columns; return this; },
      gte(column, value) { observed.column = column; observed.since = value; return this; },
      order(column, options) { observed.order = [column, options.ascending]; return this; },
      limit(value) { observed.limit = value; return this; },
    abortSignal(signal) { observed.signal = signal; return Promise.resolve({ data: events("qwen", "http_error", 3, 1000), error: null }); },
    };
  } });
  const now = Date.now();
  const result = await health.getProviderRoutingDecision(["qwen", "gemini"], now);
  assert.equal(result.skippedProviders[0].provider, "qwen");
  assert.equal(observed.columns, "provider,outcome,occurred_at");
  assert.equal(observed.column, "occurred_at");
  assert.equal(observed.order[0], "occurred_at");
  assert.equal(observed.limit, 60);
  assert.equal(Date.parse(observed.since), now - health.PROVIDER_CIRCUIT_FAILURE_WINDOW_MS);
  assert.equal(observed.signal.aborted, false);

  globalThis.__providerHealthAdmin = () => { throw new Error("unavailable"); };
  assert.deepEqual(await health.getProviderRoutingDecision(["qwen", "gemini"], now), { status: "unavailable", skippedProviders: [] });
});
