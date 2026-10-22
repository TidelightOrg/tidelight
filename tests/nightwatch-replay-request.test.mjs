import test from "node:test";
import assert from "node:assert/strict";
import { parseNightwatchReplayOrderId } from "../lib/nightwatch-replay-request.ts";

test("public Nightwatch replay request accepts only object bodies with a valid order UUID", () => {
  const valid = "b2e3ed0f-61ad-46f7-8de2-9fa57d6b7670";
  assert.equal(parseNightwatchReplayOrderId({ orderId: valid }), valid);
  for (const invalid of [null, undefined, [], "{}", 1, { orderId: "" }, { orderId: "not-a-uuid" }]) {
    assert.equal(parseNightwatchReplayOrderId(invalid), null);
  }
});
