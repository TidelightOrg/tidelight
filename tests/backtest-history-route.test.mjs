import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const intervalMs = 4 * 60 * 60 * 1000;
const candles = Array.from({ length: 400 }, (_, index) => {
  const close = 100 + index * 0.02 + 3 * Math.sin(index / 13);
  const open = index ? 100 + (index - 1) * 0.02 + 3 * Math.sin((index - 1) / 13) : 100;
  return {
    timestamp: Date.UTC(2025, 0, 1) + index * intervalMs,
    open,
    high: Math.max(open, close) + 0.1,
    low: Math.min(open, close) - 0.1,
    close,
    volume: 10_000 + index,
    turnover: 1_000_000 + index,
  };
});

test("insufficient market history returns an actionable 422 instead of a provider outage", async () => {
  globalThis.backtestHistoryRouteTest = { candles, providerFailure: false };
  const mocks = {
    "@/lib/bitget-market": `export const getBitgetAsset=async()=>({symbol:'RAAPLUSDT',name:'Apple',isReality:true,kind:'rtoken',providerTimestamp:null,tradingSessions:[],weekendTradable:true}); export const getBitgetStockPerp=async()=>null; export const getBitgetCandles=async()=>{ if(globalThis.backtestHistoryRouteTest.providerFailure) throw new Error('provider-timeout'); return globalThis.backtestHistoryRouteTest.candles; };`,
    "@/lib/supabase/server": "export const createClient=async()=>({});",
    "@/lib/supabase/auth-user": "export const getServerAuthState=async()=>({user:{id:'test-owner'},errorCode:null});",
  };
  const hooks = registerHooks({ resolve(specifier, _context, nextResolve) {
    if (specifier === "@/lib/backtest") return { url: new URL("../lib/backtest.ts", import.meta.url).href, shortCircuit: true };
    if (specifier === "@/lib/backtest-manifest") return { url: new URL("../lib/backtest-manifest.ts", import.meta.url).href, shortCircuit: true };
    if (mocks[specifier]) return { url: `data:text/javascript,${encodeURIComponent(mocks[specifier])}`, shortCircuit: true };
    return nextResolve(specifier);
  } });

  try {
    const route = await import("../app/api/strategies/backtest/route.ts?test=insufficient-history");
    const request = () => new Request("https://tidelight.app/api/strategies/backtest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ symbol: "RAAPLUSDT", marketCategory: "SPOT", interval: "4H", strategyKey: "sma_trend_v1" }),
    });

    const historyResponse = await route.POST(request());
    assert.equal(historyResponse.status, 422);
    assert.deepEqual(await historyResponse.json(), {
      error: "This market’s completed candle history is too short to provide the required 30-day holdout. Choose a market or interval with more history.",
      code: "insufficient_history",
    });

    globalThis.backtestHistoryRouteTest.providerFailure = true;
    const providerResponse = await route.POST(request());
    assert.equal(providerResponse.status, 503);
    assert.match((await providerResponse.json()).error, /Retry shortly/);
  } finally {
    hooks.deregister();
    delete globalThis.backtestHistoryRouteTest;
  }
});
