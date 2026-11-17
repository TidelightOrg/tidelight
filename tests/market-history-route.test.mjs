import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "next/server") return { url: "data:text/javascript,export const NextResponse={json:(body,init)=>Response.json(body,init)}", shortCircuit: true };
  if (specifier === "@/lib/bitget-market") return { url: `data:text/javascript,${encodeURIComponent('export const getBitgetCandles=async()=>{const value=globalThis.marketHistoryFixtures??[];if(value instanceof Error)throw value;return value;}')}`, shortCircuit: true };
  return nextResolve(specifier, context);
} });
const { GET } = await import("../app/api/market/history/route.ts?history-observation-test");
hooks.deregister();

test("market history labels its source, UTC receipt, and finalized candles", async () => {
  const now = Date.now();
  const step = 4 * 60 * 60 * 1000;
  globalThis.marketHistoryFixtures = [
    { timestamp: now - 2 * step, close: 100, providerTimestamp: 1_800_000_000_000 },
    { timestamp: now - step + 60_000, close: 101 },
  ];
  const response = await GET(new Request("https://tidelight.app/api/market/history?symbol=RNVDAUSDT"));
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.source, "Bitget");
  assert.equal(result.marketCategory, "SPOT");
  assert.equal(result.interval, "4H");
  assert.equal(result.timestampTimezone, "UTC");
  assert.equal(result.candleFinality, "provider_timestamp_checked");
  assert.equal(result.providerTimestamp, 1_800_000_000_000);
  assert.equal(result.candles.length, 1);
  assert.equal(result.candles[0].finality, "verified_closed");
  assert.ok(result.candles[0].t + step <= result.receivedAt);
  assert.ok(result.candles[0].t + step <= result.candles[0].providerTimestamp);
});

test("a cached response clock before candle close cannot mark the candle finalized", async () => {
  const now = Date.now();
  const step = 4 * 60 * 60 * 1000;
  globalThis.marketHistoryFixtures = [{ timestamp: now - step - 10_000, close: 100, providerTimestamp: now - 60_000 }];
  const response = await GET(new Request("https://tidelight.app/api/market/history?symbol=RNVDAUSDT"));
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.candles.length, 0, "the cached provider observation predates the candle close");
  assert.equal(result.candleFinality, "provider_timestamp_checked");
});

test("market history reports provider outages instead of an empty successful series", async () => {
  globalThis.marketHistoryFixtures = new Error("provider unavailable");
  const response = await GET(new Request("https://tidelight.app/api/market/history?symbol=RNVDAUSDT"));
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /temporarily unavailable/i);
});
