import test from "node:test";
import assert from "node:assert/strict";
import { getBitgetRealityTradeQuote } from "../lib/bitget-market.ts";

test("Reality trade quote selects newest actual fill and bypasses response caching", async t => {
  const priorFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url: new URL(url), options };
    return Response.json({ code: "00000", data: [
      { price: "207.25", ts: "1800000000100" },
      { price: "207.50", ts: "1800000000200" },
      { price: "0", ts: "1800000000300" },
      { price: "207.75", ts: "invalid" },
    ] });
  };
  t.after(() => { globalThis.fetch = priorFetch; });

  const quote = await getBitgetRealityTradeQuote("RNVDAUSDT");
  assert.deepEqual(quote, { price: 207.5, providerTimestamp: 1_800_000_000_200 });
  assert.equal(request.url.pathname, "/api/v3/market/fills");
  assert.equal(request.url.searchParams.get("category"), "SPOT");
  assert.equal(request.url.searchParams.get("symbol"), "RNVDAUSDT");
  assert.equal(request.options.cache, "no-store");
});

test("Reality fill lookup rejects unsafe symbols and empty fill data", async t => {
  const priorFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return Response.json({ code: "00000", data: [] });
  };
  t.after(() => { globalThis.fetch = priorFetch; });

  assert.equal(await getBitgetRealityTradeQuote("../../private"), null);
  assert.equal(await getBitgetRealityTradeQuote("RNVDAUSDT"), null);
  assert.equal(calls, 1);
});
