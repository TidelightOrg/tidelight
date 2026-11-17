import test from "node:test";
import assert from "node:assert/strict";

const originalFetch = globalThis.fetch;
const received = [];
globalThis.fetch = async (input) => {
  const url = new URL(input);
  received.push(url.pathname + url.search);
  let data;
  if (url.pathname.endsWith("/market/instruments")) data = [{ symbol: "RNVDAUSDT", category: "SPOT", baseCoin: "rNVDA", quoteCoin: "USDT", status: "online", isReality: "YES" }];
  else if (url.pathname.endsWith("/market/tickers")) data = [{ symbol: "RNVDAUSDT", category: "SPOT", lastPrice: "145.5", ts: "1800000000000" }];
  else if (url.pathname.endsWith("/market/candles")) data = [["1799990000000", "1", "2", "0.5", "1.5", "100", "150"]];
  else if (url.pathname.endsWith("/reality/market/stock-info")) data = [{ symbol: "RNVDAUSDT", code: "NVDA", name: "NVIDIA Corporation", tradingPeriod: ["regular"], weekendTradable: "NO" }];
  else data = { market: "US", daylightType: "dst", stateList: [{ state: "regular", timeZone: "America/New_York", startTime: "09:30", endTime: "16:00" }] };
  return Response.json({ code: "00000", requestTime: 1_800_000_000_001, data });
};
const { getBitgetCandles, getBitgetMarketUniverse } = await import("../lib/bitget-market.ts?observation-contract-test");
test.after(() => { globalThis.fetch = originalFetch; });

test("market observations preserve provider and Tidelight receipt timestamps with confirmed market context", async () => {
  received.length = 0;
  const before = Date.now();
  const market = await getBitgetMarketUniverse();
  const after = Date.now();
  assert.equal(market.provider, "Bitget");
  assert.equal(market.timestampTimezone, "UTC");
  assert.equal(typeof market.receivedAt, "number");
  assert.ok(market.receivedAt >= before && market.receivedAt <= after);
  const [asset] = market.assets;
  assert.equal(asset.symbol, "RNVDAUSDT");
  assert.equal(asset.quoteCoin, "USDT");
  assert.equal(asset.instrumentStatus, "online");
  assert.equal(asset.providerTimestamp, 1_800_000_000_000);
  assert.equal(asset.receivedAt, market.receivedAt);
  assert.equal(asset.marketSession.schedule[0].timeZone, "America/New_York");
  assert.ok(received.some(path => path.includes("/market/instruments")));
});

test("candle observations retain provider response time separately from candle UTC time", async () => {
  const [candle] = await getBitgetCandles("RNVDAUSDT", "4H", 1);
  assert.equal(candle.timestamp, 1_799_990_000_000);
  assert.equal(candle.providerTimestamp, 1_800_000_000_001);
});
