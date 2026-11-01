import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "@/lib/bitget-market") {
    const fixture = `
      export const STOCK_PERP_UNIVERSE = ["NVDAUSDT"];
      export const getBitgetStockPerp = async () => ({ symbol: "NVDAUSDT", lastPrice: 100, change24h: 0, high24h: 101, low24h: 99, open24h: 100, volume24h: 1, turnover24h: 100, providerTimestamp: 1000 });
      export const getBitgetCandles = async () => [];
    `;
    return { url: `data:text/javascript,${encodeURIComponent(fixture)}`, shortCircuit: true };
  }
  return nextResolve(specifier, context);
} });
const route = await import("../app/api/futures/candles/route.ts");
hooks.deregister();

test("execution market route disables cached order-book snapshots", async (t) => {
  const requests = [];
  t.mock.method(globalThis, "fetch", async (input, init) => {
    requests.push({ url: String(input), init });
    return Response.json({ code: "00000", data: [] });
  });
  const response = await route.GET(new Request("https://tidelight.app/api/futures/candles?symbol=NVDAUSDT&interval=15m"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(requests.length, 3);
  assert.ok(requests.every(({ init }) => init.cache === "no-store"), "Bitget book, trade, and funding responses bypass the Next data cache");
  assert.ok(requests.some(({ url }) => url.includes("/market/orderbook?")), "the visible depth request is among the uncached requests");
});
