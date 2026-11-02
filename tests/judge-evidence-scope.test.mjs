import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const judgePage = await readFile(new URL("../app/judge/page.tsx", import.meta.url), "utf8");

test("Judge Mode labels the old route capture as historical availability evidence", () => {
  assert.match(judgePage, /HISTORICAL ROUTE CHECK · 24 OCT 2026/);
  assert.match(judgePage, /Historical HTTP responses only/);
  assert.match(judgePage, /NOT A JOURNEY TEST/);
  assert.match(judgePage, /did not verify page rendering, source retrieval, evidence quality, AI synthesis, sign-in, or paper actions/);
  assert.doesNotMatch(judgePage, /Seven public routes returned HTTP 200/);
  assert.doesNotMatch(judgePage, /7 \/ 7 PASS/);
});
