import assert from "node:assert/strict";
import test from "node:test";

const { formatPublicCapsulePrice } = await import("../lib/decision-capsule-format.ts");

test("public capsule prices preserve fractional digits below one thousandth", () => {
  assert.equal(formatPublicCapsulePrice(0.0001, "en-US"), "0.0001");
  assert.equal(formatPublicCapsulePrice(0.0002, "en-US"), "0.0002");
  assert.equal(formatPublicCapsulePrice(1_250.1234567, "en-US"), "1,250.1234567");
});

test("public capsule price formatting rejects non-finite values", () => {
  assert.equal(formatPublicCapsulePrice(Number.NaN, "en-US"), "—");
  assert.equal(formatPublicCapsulePrice(Infinity, "en-US"), "—");
});
