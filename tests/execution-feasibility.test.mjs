import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "@/lib/execution-feasibility") return { url: new URL("../lib/execution-feasibility.ts", import.meta.url).href, shortCircuit: true };
  return nextResolve(specifier, context);
} });
const { bestExecutableBookPrices, estimateBookSweep, estimateSizeSensitivity, executionSidesForAction, serverAnchoredSnapshotNow } = await import("@/lib/execution-feasibility");

test("best reference prices ignore unusable zero and negative size levels", () => {
  assert.deepEqual(bestExecutableBookPrices(
    [{ price: 90, size: 0 }, { price: 101, size: 2 }, { price: 99, size: -1 }],
    [{ price: 110, size: 0 }, { price: 100, size: 3 }, { price: 102, size: -1 }],
  ), { bestAsk: 101, bestBid: 100 });
  assert.deepEqual(bestExecutableBookPrices([{ price: 90, size: 0 }], []), { bestAsk: null, bestBid: null });
});
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

test("server-anchored book freshness advances after client receipt and fails closed on stale polling", () => {
  const serverReceivedAt = 20_000;
  const clientReceivedAt = 50_000;
  const localNow = clientReceivedAt + 16_000;
  const comparisonNow = serverAnchoredSnapshotNow(serverReceivedAt, clientReceivedAt, localNow);
  assert.equal(comparisonNow, 36_000);
  const estimate = estimateBookSweep({ levels: [{ price: 100, size: 2 }], side: "buy", quantity: 1, referencePrice: 100, bookTimestamp: serverReceivedAt, now: comparisonNow });
  assert.equal(estimate.status, "unavailable", "the retained snapshot ages beyond 15 seconds when polling fails");
});

test("execution confirmation sides match open and close actions", () => {
  assert.deepEqual(executionSidesForAction("open_long", null), { primarySide: "buy", secondarySide: "sell" });
  assert.deepEqual(executionSidesForAction("open_short", null), { primarySide: "sell", secondarySide: "buy" });
  assert.deepEqual(executionSidesForAction("close", "long"), { primarySide: "sell", secondarySide: null });
  assert.deepEqual(executionSidesForAction("close", "short"), { primarySide: "buy", secondarySide: null });
  assert.deepEqual(executionSidesForAction("close", null), { primarySide: null, secondarySide: null });
});

test("slow delivery counts against order-book freshness", () => {
  const comparisonNow = serverAnchoredSnapshotNow(20_000, 50_000, 66_000);
  assert.equal(comparisonNow, 36_000);
  assert.equal(estimateBookSweep({ levels: [{ price: 101, size: 5 }], side: "buy", quantity: 1, referencePrice: 100, oppositeBestPrice: 99, bookTimestamp: 20_000, now: comparisonNow }).status, "unavailable");
});

test("server processing is excluded and future venue skew is checked at receipt", () => {
  assert.equal(serverAnchoredSnapshotNow(20_000, 50_000, 58_000, 6_000), 22_000);
  assert.equal(estimateBookSweep({ levels: [{ price: 101, size: 5 }], side: "buy", quantity: 1, referencePrice: 100, oppositeBestPrice: 99, bookTimestamp: 26_000, receivedAt: 20_000, now: 28_000 }).status, "unavailable");
});

test("size sensitivity reuses the same visible book and reports incomplete depth", () => {
  const [small, large] = estimateSizeSensitivity({ levels: [{price: 101, size: 1}, {price: 102, size: 1}], side: "buy", quantity: 1.5, referencePrice: 100, oppositeBestPrice: 99, bookTimestamp: 20_000, now: 20_000 });
  assert.equal(small.multiplier, 0.5);
  assert.equal(small.sweep.averagePrice, 101);
  assert.equal(large.sweep.status, "insufficient_depth");
  assert.equal(large.sweep.filledQuantity, 2);
  assert.equal(large.sweep.requestedQuantity, 3);
  const stale = estimateSizeSensitivity({ levels: [{price: 101, size: 5}], side: "buy", quantity: 1, referencePrice: 100, oppositeBestPrice: 99, bookTimestamp: 1, now: 20_000 });
  assert.ok(stale.every(result => result.sweep.status === "unavailable"));
});
