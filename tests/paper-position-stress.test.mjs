import test from "node:test";
import assert from "node:assert/strict";
import { paperPositionStress } from "../lib/paper-position-stress.ts";

test("adverse moves produce direction-aware prices and incremental margin losses", () => {
  const common = { quantity: 2, referencePrice: 100, referenceTimestamp: 1000, margin: 50, now: 2000 };
  const long = paperPositionStress({ ...common, direction: "long" });
  const short = paperPositionStress({ ...common, direction: "short" });
  assert.equal(long[0].stressedPrice, 95);
  assert.ok(Math.abs(short[1].stressedPrice - 110) < 1e-10);
  assert.ok(Math.abs(short[1].loss - 20) < 1e-10);
  assert.equal(long[0].marginFraction, 0.2);
});

test("missing or invalid inputs cannot produce a stress estimate", () => {
  const base = { direction: "long", quantity: 2, referencePrice: 100, referenceTimestamp: 1000, margin: 50, now: 2000 };
  for (const patch of [{ referencePrice: NaN }, { now: 61_001 }, { now: -4_001 }, { referenceTimestamp: 0 }, { margin: 0 }, { quantity: -1 }, { direction: "other" }, { referenceTimestamp: 1e20 }, { quantity: Number.MAX_VALUE }]) assert.equal(paperPositionStress({ ...base, ...patch }), null);
});

test("freshness bounds reject stale and future marks", () => {
  const base = { direction: "long", quantity: 1, referencePrice: 100, referenceTimestamp: 100_000, margin: 100 };
  assert.ok(paperPositionStress({ ...base, now: 160_000 }));
  assert.equal(paperPositionStress({ ...base, now: 160_001 }), null);
  assert.ok(paperPositionStress({ ...base, now: 95_000 }));
  assert.equal(paperPositionStress({ ...base, now: 94_999 }), null);
});
