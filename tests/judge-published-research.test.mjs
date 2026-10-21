import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Judge Mode promotes live owner-published research instead of the static fixture", async () => {
  const page = await readFile(new URL("../app/judge/page.tsx", import.meta.url), "utf8");
  for (const token of ["c5f5b22e-c995-4a5e-8193-5737c4d413b8", "4e86bf9c-7295-4be1-ae52-487341e7f1ca", "5d27e66c-2a87-4450-95d3-5014e1309216", "7ca56a20-c064-4f99-b351-806b2ddd685e", "c67d7b29-85eb-4c27-8a29-2cbe85bd4e91"]) {
    assert.ok(page.includes(token), `Judge page is missing replay ${token}`);
  }
  assert.doesNotMatch(page, /href=["']\/replay["']/);
  assert.match(page, /AI synthesis was unavailable in each/i);
});

test("README separates live judge research from the link directory and data exports", async () => {
  const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
  const judge = readme.indexOf("## Judge research · live public replays");
  const links = readme.indexOf("## Judge links · Tidelight ecosystem");
  const data = readme.indexOf("## Research data and trading artifacts");
  assert.ok(judge >= 0 && judge < links);
  assert.ok(data >= 0 && data < links);
  assert.match(readme, /\[JSON\]\(https:\/\/tidelight\.app\/api\/research\/replays\//);
  assert.match(readme, /AI synthesis unavailable/);
});

test("evidence manifest lists the seven owner-published judge replays and their limits", async () => {
  const source = await readFile(new URL("../public/evidence/manifest.json", import.meta.url), "utf8");
  const manifest = JSON.parse(source);
  assert.equal(manifest.owner_published_research.replays.length, 7);
  assert.equal(manifest.owner_published_research.expires_after_days, 30);
  assert.equal(manifest.owner_published_research.replays.filter((run) => run.ai_synthesis === "unavailable").length, 5);
});
