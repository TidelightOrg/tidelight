import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Agent Flow prompt requests evidence point fields its validator requires", async () => {
  const route = await readFile(new URL("../app/api/research/agent-flow/route.ts", import.meta.url), "utf8");
  const policy = await readFile(new URL("../lib/agent-flow-policy.ts", import.meta.url), "utf8");
  assert.ok(policy.includes("text: string; citedUrls: string[]"));
  assert.ok(policy.includes("row.citedUrls"));
  assert.ok(route.includes("Each supportingEvidence and counterEvidence item must be {text,citedUrls:[exact supplied URLs]}"));
});
