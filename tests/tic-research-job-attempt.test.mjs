import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("blocked Codex Cloud research attempt is published without claiming jobs ran", async () => {
  const record = JSON.parse(await readFile(new URL("../public/evidence/tidelight-research-job-client-attempt-20261024.json", import.meta.url), "utf8"));
  const judge = await readFile(new URL("../app/judge/page.tsx", import.meta.url), "utf8");
  const manifest = JSON.parse(await readFile(new URL("../public/evidence/manifest.json", import.meta.url), "utf8"));
  assert.equal(record.outcome.npm_jobs_submitted, 0);
  assert.equal(record.outcome.python_jobs_submitted, 0);
  assert.equal(record.outcome.mcp_jobs_submitted, 0);
  assert.equal(record.outcome.credentials_changed, false);
  assert.equal(record.outcome.oauth_grants_changed, false);
  assert.deepEqual(record.steps[3].tools, ["tidelight_get_tokenized_equity", "tidelight_search_tokenized_equities"]);
  assert.ok(judge.includes("/evidence/tidelight-research-job-client-attempt-20261024.json"));
  assert.ok(manifest.evidence_inventory.some(item => item.id === "authenticated-research-job-client-attempt-20261024"));
});
