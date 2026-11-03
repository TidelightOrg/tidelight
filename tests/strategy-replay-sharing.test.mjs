import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const runId = "d475bd46-5035-4ae5-9f19-e2959a4f0734";
const publicId = "d2c5b271-9da4-4df1-8798-14a430cf91fc";
const candles = [
  { timestamp: 1_800_000_000_000, open: 100, high: 102, low: 99, close: 101, volume: 20, turnover: 2020 },
  { timestamp: 1_800_014_400_000, open: 101, high: 103, low: 100, close: 102, volume: 22, turnover: 2244 },
];
const { createBacktestExperimentManifest } = await import("../lib/backtest-manifest.ts");
const experimentManifest = createBacktestExperimentManifest({ symbol: "RAAPLUSDT", marketCategory: "SPOT", interval: "4H", assetName: "Apple Inc.", assetKind: "Reality rToken", strategyKey: "sma_trend_v1", candles, splitIndex: 1, capturedAt: 1_800_020_000_000, providerTimestamp: 1_800_019_000_000, feeBpsPerSide: 10, slippageBpsPerSide: 5, initialEquity: 10_000, sourceRevision: "a".repeat(40) });

test("strategy replay publish serializes an owned reproducible run and strips private route context", async () => {
  const calls = [];
  const run = {
    id: runId, symbol: "RAAPLUSDT", interval: "4H", strategy_key: "sma_trend_v1",
    parameters: { fast: 20, slow: 50, initialEquity: 10_000, feeBpsPerSide: 10, slippageBpsPerSide: 5, marketCategory: "SPOT", candleHash: "a".repeat(64), researchRunId: "private-research-run", assetName: "Apple Inc.", assetKind: "Reality rToken", experimentManifest },
    train_metrics: { totalReturnPct: 4.2 }, test_metrics: { totalReturnPct: -0.58, benchmarkReturnPct: 2.02 },
    data_start: new Date(candles[0].timestamp).toISOString(), data_end: new Date(candles.at(-1).timestamp).toISOString(), candle_count: candles.length,
    candles, created_at: "2026-10-24T00:00:00Z",
  };
  const query = (table) => ({
    table, filters: [], values: null,
    select(columns) { this.columns = columns; return this; },
    eq(column, value) { this.filters.push([column, value]); return this; },
    is(column, value) { this.filters.push([column, value]); return this; },
    gt(column, value) { this.filters.push([column, value]); return this; },
    lte(column, value) { this.filters.push([column, value]); return this; },
    update(values) { this.values = values; calls.push({ table, operation: "update", values, filters: this.filters }); return this; },
    insert(values) { this.values = values; calls.push({ table, operation: "insert", values }); return this; },
    maybeSingle() {
      if (table === "strategy_backtest_runs") return Promise.resolve({ data: this.filters.some(([k,v]) => k === "user_id" && v === "owner") ? run : null, error: null });
      return Promise.resolve({ data: null, error: null });
    },
    single() { return Promise.resolve({ data: { public_id: publicId, expires_at: this.values.expires_at }, error: null }); },
    then(resolve, reject) { return Promise.resolve({ data: [], error: null }).then(resolve, reject); },
  });
  const db = { from(table) { return query(table); } };
  globalThis.strategyReplayTest = { auth: { user: { id: "owner" }, errorCode: null }, db, admin: db };
  const mocks = {
    "next/server": "export const NextResponse=class extends Response { static json(data,init={}) { return Response.json(data,init); } };",
    "@/lib/supabase/server": "export const createClient=async()=>globalThis.strategyReplayTest.db;",
    "@/lib/supabase/admin": "export const createAdminClient=()=>globalThis.strategyReplayTest.admin;",
    "@/lib/supabase/auth-user": "export const getServerAuthState=async()=>globalThis.strategyReplayTest.auth;",
  };
  const hooks = registerHooks({ resolve(specifier, _context, nextResolve) {
    if (specifier === "@/lib/backtest-manifest") return { url: new URL("../lib/backtest-manifest.ts", import.meta.url).href, shortCircuit: true };
    if (mocks[specifier]) return { url: `data:text/javascript,${encodeURIComponent(mocks[specifier])}`, shortCircuit: true };
    return nextResolve(specifier);
  } });
  try {
    const route = await import("../app/api/strategy-replays/route.ts?test=strategy-publish");
    const response = await route.POST(new Request("https://tidelight.app/api/strategy-replays", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ runId }) }));
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.url, `/strategy-replay/${publicId}`);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const insert = calls.find(call => call.operation === "insert" && call.table === "public_strategy_replays");
    assert.ok(insert);
    assert.equal(insert.values.user_id, "owner");
    assert.equal(insert.values.strategy_run_id, runId);
    assert.equal(insert.values.payload.holdout.totalReturnPct, -0.58);
    assert.equal(insert.values.payload.holdout.benchmarkReturnPct, 2.02);
    assert.equal(insert.values.payload.candles.length, 2);
    assert.equal(insert.values.payload.experimentManifest.engine.version, "alpha-backtest-v1");
    assert.equal(insert.values.payload.experimentManifest.integrity.manifestDigest, experimentManifest.integrity.manifestDigest);
    assert.equal("researchRunId" in insert.values.payload.run.parameters, false);
    assert.match(insert.values.payload.notice, /not a forecast/);
    assert.ok(Date.parse(insert.values.expires_at) > Date.now() + 29 * 86_400_000);
    assert.ok(Date.parse(insert.values.expires_at) <= Date.now() + 30 * 86_400_000 + 1000);

    let insertCount = calls.filter(call => call.operation === "insert" && call.table === "public_strategy_replays").length;
    const longAssetName = `Apple ${"X".repeat(180)}`;
    run.parameters.assetName = longAssetName;
    run.parameters.experimentManifest = createBacktestExperimentManifest({ symbol: "RAAPLUSDT", marketCategory: "SPOT", interval: "4H", assetName: longAssetName, assetKind: "Reality rToken", strategyKey: "sma_trend_v1", candles, splitIndex: 1, capturedAt: 1_800_020_000_000, providerTimestamp: 1_800_019_000_000, feeBpsPerSide: 10, slippageBpsPerSide: 5, initialEquity: 10_000, sourceRevision: "a".repeat(40) });
    const longName = await route.POST(new Request("https://tidelight.app/api/strategy-replays", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ runId }) }));
    assert.equal(longName.status, 200);
    assert.equal(calls.filter(call => call.operation === "insert" && call.table === "public_strategy_replays").at(-1).values.payload.asset.name, longAssetName.slice(0, 160));
    insertCount = calls.filter(call => call.operation === "insert" && call.table === "public_strategy_replays").length;
    run.parameters.assetName = "Apple Inc.";
    run.parameters.experimentManifest = experimentManifest;
    run.candle_count += 1;
    const mismatchedDataset = await route.POST(new Request("https://tidelight.app/api/strategy-replays", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ runId }) }));
    assert.equal(mismatchedDataset.status, 422);
    run.candle_count = candles.length;
    run.strategy_key = "different_strategy";
    const mismatchedIdentity = await route.POST(new Request("https://tidelight.app/api/strategy-replays", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ runId }) }));
    assert.equal(mismatchedIdentity.status, 422);
    assert.equal(calls.filter(call => call.operation === "insert" && call.table === "public_strategy_replays").length, insertCount);
    run.strategy_key = "sma_trend_v1";
    run.candles = candles.map((candle, index) => index === 1 ? { ...candle, close: candle.close + 1 } : candle);
    const tampered = await route.POST(new Request("https://tidelight.app/api/strategy-replays", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ runId }) }));
    assert.equal(tampered.status, 422);
    assert.equal(calls.filter(call => call.operation === "insert" && call.table === "public_strategy_replays").length, insertCount);

    const clientSource = await (await import("node:fs/promises")).readFile(new URL("../app/ui/strategy-replay-share.tsx", import.meta.url), "utf8");
    assert.match(clientSource, /navigator\.clipboard\.writeText\(url\)/);
    assert.match(clientSource, /fetch\(`\/api\/strategy-replays\/\$\{encodeURIComponent\(token/);
    assert.match(clientSource, /Revoke/);
  } finally { hooks.deregister(); delete globalThis.strategyReplayTest; }
});

test("public strategy replay read is unauthenticated and revocation is restricted to its owner", async () => {
  const filters = [];
  const row = { payload: { schemaVersion: 1, run: { id: runId }, candles: [] }, created_at: "2026-10-24T00:00:00Z", expires_at: "2026-11-23T00:00:00Z" };
  const makeQuery = (table) => ({
    table, filters: [], updateValues: null,
    select() { return this; }, eq(k,v) { this.filters.push([k,v]); return this; }, is(k,v) { this.filters.push([k,v]); return this; }, gt(k,v) { this.filters.push([k,v]); return this; },
    update(values) { this.updateValues = values; filters.push({ table, filters: this.filters, values }); return this; },
    maybeSingle() { return Promise.resolve({ data: this.filters.some(([k,v]) => k === "public_id" && v === publicId) ? row : null, error: null }); },
    then(resolve,reject) { return Promise.resolve({ data: { public_id: publicId }, error: null }).then(resolve,reject); },
  });
  const db = { from(table) { return makeQuery(table); } };
  globalThis.strategyReplayTest = { auth: { user: { id: "owner" }, errorCode: null }, db, admin: db };
  const mocks = {
    "next/server": "export const NextResponse=class extends Response { static json(data,init={}) { return Response.json(data,init); } };",
    "@/lib/supabase/server": "export const createClient=async()=>globalThis.strategyReplayTest.db;",
    "@/lib/supabase/admin": "export const createAdminClient=()=>globalThis.strategyReplayTest.admin;",
    "@/lib/supabase/auth-user": "export const getServerAuthState=async()=>globalThis.strategyReplayTest.auth;",
  };
  const hooks = registerHooks({ resolve(specifier, _context, nextResolve) {
    if (mocks[specifier]) return { url: `data:text/javascript,${encodeURIComponent(mocks[specifier])}`, shortCircuit: true };
    return nextResolve(specifier);
  } });
  try {
    const route = await import("../app/api/strategy-replays/[token]/route.ts?test=strategy-revoke");
    const get = await route.GET(new Request(`https://tidelight.app/api/strategy-replays/${publicId}`), { params: Promise.resolve({ token: publicId }) });
    assert.equal(get.status, 200);
    assert.equal(get.headers.get("cache-control"), "no-store");
    assert.equal((await get.json()).run.id, runId);
    const deleted = await route.DELETE(new Request(`https://tidelight.app/api/strategy-replays/${publicId}`, { method: "DELETE" }), { params: Promise.resolve({ token: publicId }) });
    assert.equal(deleted.status, 200);
    assert.deepEqual(await deleted.json(), { revoked: true });
    assert.ok(filters.some(item => item.table === "public_strategy_replays" && item.filters.some(([k,v]) => k === "user_id" && v === "owner")));
    assert.ok(filters.some(item => item.table === "public_strategy_replays" && item.values?.revoked_at));
  } finally { hooks.deregister(); delete globalThis.strategyReplayTest; }
});
