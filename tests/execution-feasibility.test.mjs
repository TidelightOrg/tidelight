import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "@/lib/execution-feasibility") return { url: new URL("../lib/execution-feasibility.ts", import.meta.url).href, shortCircuit: true };
  return nextResolve(specifier, context);
} });
const { estimateBookSweep, executionSidesForAction } = await import("@/lib/execution-feasibility");
hooks.deregister();

test("book sweep prices a buy across visible ask levels", () => {
  const result = estimateBookSweep({
    levels: [{ price: 101, size: 2 }, { price: 100, size: 1 }], side: "buy", quantity: 2,
    referencePrice: 100, bookTimestamp: 1000, now: 2000,
  });
  assert.equal(result.status, "estimated");
  assert.equal(result.visibleCapacity, 3);
  assert.equal(result.averagePrice, 100.5);
  assert.equal(result.slippageBps, 50);
});

test("book sweep prices a sell against visible bids and reports insufficient capacity", () => {
  const result = estimateBookSweep({
    levels: [{ price: 99, size: 1 }, { price: 100, size: 2 }], side: "sell", quantity: 4,
    referencePrice: 100, bookTimestamp: 1000, now: 2000,
  });
  assert.equal(result.status, "insufficient_depth");
  assert.equal(result.coveragePct, 75);
  assert.equal(result.averagePrice, 99 + 2 / 3);
  assert.ok(Math.abs(result.slippageBps - 100 / 3) < 1e-9);
});

test("missing, stale, future-dated, and malformed books never produce an estimate", () => {
  const base = { levels: [{ price: 100, size: 3 }], side: "buy", quantity: 1, referencePrice: 100, now: 20_000 };
  assert.equal(estimateBookSweep({ ...base, bookTimestamp: null }).status, "unavailable");
  assert.equal(estimateBookSweep({ ...base, bookTimestamp: 1000 }).status, "unavailable");
  assert.equal(estimateBookSweep({ ...base, bookTimestamp: 30_000 }).status, "unavailable");
  assert.equal(estimateBookSweep({ ...base, levels: [{ price: 0, size: 10 }], bookTimestamp: 19_000 }).status, "unavailable");
  assert.equal(estimateBookSweep({ ...base, levels: [{ price: 99, size: 3 }], oppositeBestPrice: 100, bookTimestamp: 19_000 }).status, "unavailable", "crossed books never create a slippage estimate");
});

test("near-future venue timestamps honor the five-second server-receipt skew allowance", () => {
  const base = { levels: [{ price: 100, size: 3 }], side: "buy", quantity: 1, referencePrice: 100, now: 20_000 };
  assert.equal(estimateBookSweep({ ...base, bookTimestamp: 25_000 }).status, "estimated");
  assert.equal(estimateBookSweep({ ...base, bookTimestamp: 25_001 }).status, "unavailable");
});

test("execution confirmation sides match open and close actions", () => {
  assert.deepEqual(executionSidesForAction("open_long", null), { primarySide: "buy", secondarySide: "sell" });
  assert.deepEqual(executionSidesForAction("open_short", null), { primarySide: "sell", secondarySide: "buy" });
  assert.deepEqual(executionSidesForAction("close", "long"), { primarySide: "sell", secondarySide: null });
  assert.deepEqual(executionSidesForAction("close", "short"), { primarySide: "buy", secondarySide: null });
  assert.deepEqual(executionSidesForAction("close", null), { primarySide: null, secondarySide: null });
});
