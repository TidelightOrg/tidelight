import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("judge rehearsal is clearly simulated and does not imply a live fill", async () => {
  const page = await readFile(new URL("../app/demo/page.tsx", import.meta.url), "utf8");
  assert.match(page, /SIMULATED JUDGE REHEARSAL/);
  assert.match(page, /no live order/i);
  assert.match(page, /no live market data/i);
  assert.match(page, /invented paper fill/i);
  assert.match(page, /Run the real evaluator path/);
});
