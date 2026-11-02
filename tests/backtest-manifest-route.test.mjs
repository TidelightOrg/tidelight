import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { fingerprintBacktestCandles, verifyBacktestExperimentManifest } from "../lib/backtest-manifest.ts";

const intervalMs = 4 * 60 * 60 * 1000;
const first = Date.UTC(2025, 0, 1);
const candles = [];
let previous = 100;
for (let index = 0; index < 600; index += 1) {
  const close = 100 + index * 0.02 + 3 * Math.sin(index / 13);
  const open = previous;
  candles.push({ timestamp: first + index * intervalMs, open, high: Math.max(open, close) + 0.1, low: Math.min(open, close) - 0.1, close, volume: 10_000 + index, turnover: 1_000_000 + index });
  previous = close;
}

test("backtest route returns and persists a manifest over the exact completed fixture candle set", async () => {
  globalThis.backtestManifestTest = {
    candles,
    asset: { symbol: "RNVDAUSDT", baseCoin: "RNVDA", quoteCoin: "USDT", name: "NVIDIA", underlyingTicker: "NVDA", kind: "rtoken", isReality: true, isRwa: true, weekendTradable: true, tradingSessions: ["24/7"], marketSession: null, marketSessionStatus: "available", lastPrice: 200, open24h: 198, change24h: 1, high24h: 201, low24h: 197, volume24h: 1000, turnover24h: 200000, providerTimestamp: Date.now(), logoUrl: null },
  };
  const mocks = {
    "next/server": "export const NextResponse=class extends Response { static json(data,init={}) { return Response.json(data,init); } };",
    "@/lib/bitget-market": "export const getBitgetAsset=async()=>globalThis.backtestManifestTest.asset; export const getBitgetStockPerp=async()=>globalThis.backtestManifestTest.asset; export const getBitgetCandles=async()=>globalThis.backtestManifestTest.candles;",
    "@/lib/supabase/server": `export const createClient=async()=>({
      from(table){ return {
        insert(values){
          globalThis.backtestManifestTest.inserted={table,values};
          return { select(){ return { single:async()=>({ data:{id:'93b1b5e8-64a4-4bc5-9ba0-f97bc0ad6a6c',created_at:'2026-11-02T00:00:00.000Z'},error:null }) }; } };
        }
      }; }
    });`,
    "@/lib/supabase/auth-user": "export const getServerAuthState=async()=>({user:{id:'owner'},errorCode:null});",
  };
  const hooks = registerHooks({ resolve(specifier, _context, nextResolve) {
    if (specifier === "@/lib/backtest") return { url: new URL("../lib/backtest.ts", import.meta.url).href, shortCircuit: true };
    if (specifier === "@/lib/backtest-manifest") return { url: new URL("../lib/backtest-manifest.ts", import.meta.url).href, shortCircuit: true };
    if (mocks[specifier]) return { url: `data:text/javascript,${encodeURIComponent(mocks[specifier])}`, shortCircuit: true };
    return nextResolve(specifier);
  } });
  try {
    const route = await import("../app/api/strategies/backtest/route.ts?test=experiment-manifest");
    const response = await route.POST(new Request("https://tidelight.app/api/strategies/backtest", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ symbol: "RNVDAUSDT", marketCategory: "SPOT", interval: "4H", strategyKey: "sma_trend_v1" }) }));
    assert.equal(response.status, 200);
    const run = (await response.json()).run;
    assert.ok(run.experimentManifest);
    assert.equal(run.experimentManifest.dataset.fingerprint.value, fingerprintBacktestCandles(run.candles));
    assert.equal(verifyBacktestExperimentManifest(run.experimentManifest, run.candles), true);
    assert.deepEqual(globalThis.backtestManifestTest.inserted.values.parameters.experimentManifest, run.experimentManifest);
    assert.equal(globalThis.backtestManifestTest.inserted.values.parameters.marketCategory, "SPOT");
  } finally {
    hooks.deregister();
    delete globalThis.backtestManifestTest;
  }
});
