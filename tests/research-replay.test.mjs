import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("public research replay is explicitly a static non-live fixture", async () => {
  const source = await readFile(new URL("../lib/research-replay.ts", import.meta.url), "utf8");
  assert.match(source, /mode: "fixture_not_live"/);
  assert.match(source, /not a live market event/);
  assert.match(source, /No source captured in this fixture/);
  assert.match(source, /"not_run"/);
  assert.match(source, /No paper order or fill exists in this fixture/);
});

test("replay UI carries the fixture warning and links to real research", async () => {
  const page = await readFile(new URL("../app/replay/page.tsx", import.meta.url), "utf8");
  assert.match(page, /STATIC FIXTURE · NOT LIVE RESEARCH/);
  assert.match(page, /Run the live research workflow/);
  assert.match(page, /\/evidence/);
});
