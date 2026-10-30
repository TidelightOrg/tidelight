import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Overview and Research Desk evidence briefs expose public replay publishing", async () => {
  const workspace = await readFile(new URL("../app/ui/research-workspace.tsx", import.meta.url), "utf8");
  const overview = await readFile(new URL("../app/overview/page.tsx", import.meta.url), "utf8");
  const replayRoute = await readFile(new URL("../app/api/research/replays/route.ts", import.meta.url), "utf8");
  assert.match(overview, /<ResearchWorkspace/);
  assert.match(workspace, /ResearchReplayShare researchRunId=\{brief\.research_run_id\}/);
  assert.match(replayRoute, /evidenceBrief/);
  assert.match(replayRoute, /Source-bounded research saved/);
  assert.match(replayRoute, /validUrls/);
});

test("public evidence replays preserve the explicit unknown answer state", async () => {
  const route = await readFile(new URL("../app/api/research/replays/route.ts", import.meta.url), "utf8");
  const page = await readFile(new URL("../app/replay/[token]/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/replay/[token]/shared-replay.css", import.meta.url), "utf8");

  assert.match(route, /summary\.answer_status/);
  assert.match(route, /answerStatus/);
  assert.match(page, /asset\.answerStatus === "insufficient_evidence"/);
  assert.match(page, /INSUFFICIENT EVIDENCE/);
  assert.match(page, /asset\.market\.providerTimestamp/);
  assert.match(page, /QUOTE TIME · UTC/);
  assert.match(css, /\.shared-replay-unknown/);
});

test("public replays only label quotes after matching captured source text", async () => {
  const route = await readFile(new URL("../app/api/research/replays/route.ts", import.meta.url), "utf8");
  const page = await readFile(new URL("../app/replay/[token]/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/replay/[token]/shared-replay.css", import.meta.url), "utf8");
  assert.match(route, /findQuotePassageSpan/);
  assert.match(route, /retrieved_at,excerpt/);
  assert.match(route, /claimSupportStatus: "not_independently_verified"/);
  assert.match(route, /startCodepoint: passageSpan\.start_codepoint/);
  assert.match(page, /QUOTE MATCHED/);
  assert.match(page, /SUPPORT UNVERIFIED/);
  assert.match(page, /Source passage · \{/);
  assert.match(css, /\.shared-replay-quote/);
});
