import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("evidence balance labels model placement separately from verified source support", async () => {
  const desk = await readFile(new URL("../app/ui/agent-flow-desk.tsx", import.meta.url), "utf8");
  const replay = await readFile(new URL("../app/replay/[token]/page.tsx", import.meta.url), "utf8");

  assert.equal((desk.match(/Model-assigned; source support unverified/g) ?? []).length, 2);
  assert.match(replay, /Point placement is model-assigned; cited sources do not independently verify claim support\./);
  assert.doesNotMatch(desk, /Source-linked points only/);
});
