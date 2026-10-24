import test from "node:test";
import assert from "node:assert/strict";
import { automaticTheme } from "../lib/automatic-theme.mjs";

test("automatic palette follows the visitor's local day and evening hours", () => {
  const localHour = hour => new Date(2026, 0, 2, hour, 0, 0, 0);
  assert.equal(automaticTheme(localHour(6)), "night");
  assert.equal(automaticTheme(localHour(7)), "daylight");
  assert.equal(automaticTheme(localHour(16)), "daylight");
  assert.equal(automaticTheme(localHour(17)), "blue");
  assert.equal(automaticTheme(localHour(20)), "blue");
  assert.equal(automaticTheme(localHour(21)), "night");
});
