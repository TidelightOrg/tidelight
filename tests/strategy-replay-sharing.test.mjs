import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const runId = "d475bd46-5035-4ae5-9f19-e2959a4f0734";
const publicId = "d2c5b271-9da4-4df1-8798-14a430cf91fc";

test("strategy replay publish serializes an owned reproducible run and strips private route context", async () => {
  const calls = [];
  const run = {
    id: runId, symbol: "RAAPLUSDT", interval: "4h", strategy_key: "trend_sma_20_50",
    parameters: { fast: 20, slow: 50, candleHash: "a".repeat(64), researchRunId: "private-research-run", assetName: "Apple Inc.", assetKind: "Reality rToken" },
    train_metrics: { totalReturnPct: 4.2 }, test_metrics: { totalReturnPct: -0.58, benchmarkReturnPct: 2.02 },
    data_start: "2026-07-26T00:00:00Z", data_end: "2026-10-24T00:00:00Z", candle_count: 525,
    candles: [{ time: 1, open: 100, high: 102, low: 99, close: 101, volume: 20 }], created_at: "2026-10-24T00:00:00Z",
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
    assert.equal(insert.values.payload.candles.length, 1);
    assert.equal("researchRunId" in insert.values.payload.run.parameters, false);
    assert.match(insert.values.payload.notice, /not a forecast/);
    assert.ok(Date.parse(insert.values.expires_at) > Date.now() + 29 * 86_400_000);
    assert.ok(Date.parse(insert.values.expires_at) <= Date.now() + 30 * 86_400_000 + 1000);

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
