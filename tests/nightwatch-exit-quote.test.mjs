import test from "node:test";
import assert from "node:assert/strict";
import { isFreshNightwatchExitQuote } from "../lib/nightwatch-exit-quote.ts";

test("manual paper exits require a valid price and a recent venue timestamp", () => {
  const now = 1_800_000_000_000;
  assert.equal(isFreshNightwatchExitQuote(100, now - 120_000, now), true);
  assert.equal(isFreshNightwatchExitQuote(100, now - 120_001, now), false);
  assert.equal(isFreshNightwatchExitQuote(100, now + 5_000, now), true);
  assert.equal(isFreshNightwatchExitQuote(100, now + 5_001, now), false);
  for (const timestamp of [null, 0, NaN, Infinity]) assert.equal(isFreshNightwatchExitQuote(100, timestamp, now), false);
  for (const price of [null, 0, -1, NaN, Infinity]) assert.equal(isFreshNightwatchExitQuote(price, now, now), false);
});
