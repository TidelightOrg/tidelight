import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("private saved replay route is owner-scoped and verifies the archived experiment", async () => {
  const [page, history, recordView, stylesheet] = await Promise.all([
    readFile(new URL("../app/strategies/runs/[runId]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/ui/strategy-lab.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/ui/decision-record-view.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/strategies/runs/[runId]/saved-run.css", import.meta.url), "utf8"),
  ]);
  assert.match(page, /getServerAuthState\(\)/);
  assert.match(page, /\.eq\("id", runId\)\.eq\("user_id", auth\.user\.id\)/);
  assert.match(page, /verifyBacktestExperimentManifest/);
  assert.match(page, /backtestManifestMatchesRun/);
  assert.match(page, /ARCHIVE MATCHES ITS EXPERIMENT MANIFEST/);
  assert.match(page, /does not fetch new market data or rerun the strategy/);
  assert.doesNotMatch(page, /\.insert\(|\.update\(|\.delete\(/);
  assert.match(history, /strategy-history-row-link/);
  assert.match(history, /strategies\/runs\/\$\{encodeURIComponent\(item\.id\)\}/);
  assert.match(recordView, /decisionRecordHref\.savedStrategyRun\(item\.id\)/);
  assert.match(stylesheet, /var\(--panel\)/);
  assert.match(stylesheet, /@media\(max-width:680px\)/);
});
