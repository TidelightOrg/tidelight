import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const base = new URL("../public/evidence/authenticated-research-20261025/", import.meta.url);
const json = async name => JSON.parse(await readFile(new URL(name, base), "utf8"));

test("published SDK start and poll correlate one actual completed job", async () => {
  const start = (await json("published-start.json")).find(e => e.operation === "startCompanyResearch");
  const polls = (await json("published-poll.json")).filter(e => e.operation === "get_research_job");
  assert.ok(start.job_id && start.request_id);
  assert.ok(polls.every(e => e.job_id === start.job_id && e.request_id));
  assert.equal(polls.at(-1).status, "complete");
  const provenance = await json("published-sdk-install.json");
  assert.equal(provenance.npm.version, "0.1.2");
  assert.equal(provenance.pypi.version, "0.1.2");
  assert.equal(provenance.pypi.pypi_digest_verified, true);
  assert.match(provenance.npm.integrity, /^sha512-/);
});

test("direct MCP, npm stdio and Codex connector keep distinct claims", async () => {
  assert.equal((await json("mcp.json")).filter(e => e.operation === "tidelight_get_research_job").at(-1).status, "complete");
  const stdio = (await json("stdio.json")).find(e => e.operation === "tools/list");
  assert.ok(stdio.tools.includes("tidelight_start_company_research"));
  assert.equal(stdio.extra_research_job_started, false);
  assert.equal((await json("installed-bridge.json")).research_tool_exposed, false);
  assert.ok((await json("python.json")).some(e => e.http_status === 429));
  assert.ok((await json("followup.json")).every(e => e.status === "complete"));
});

test("Judge, README and manifest link every path and checksums match", async () => {
  const page = await readFile(new URL("../app/judge/page.tsx", import.meta.url), "utf8");
  const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
  const manifest = JSON.parse(await readFile(new URL("../public/evidence/manifest.json", import.meta.url), "utf8"));
  const paths = manifest.evidence_inventory.filter(e => e.kind === "authenticated_research_path");
  assert.equal(paths.length, 4);
  for (const path of paths) for (const uri of path.artifact_uris) {
    const file = uri.split("/").at(-1);
    assert.ok(page.includes(`/authenticated-research-20261025/${file}`));
    assert.ok(readme.includes(`/authenticated-research-20261025/${file}`));
    await readFile(new URL(file, base));
  }
  for (const [file, expected] of Object.entries(await json("sha256.json"))) {
    const bytes = await readFile(new URL(file, base));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), expected, file);
    assert.doesNotMatch(bytes.toString(), /tl_(?:test|live)_[A-Za-z0-9_-]{43}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\./);
  }
});

test("all new evidence links resolve to public files, including bridge record and ZIP", async () => {
  const judge = await readFile(new URL("../app/judge/page.tsx", import.meta.url), "utf8");
  const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
  const manifest = await readFile(new URL("../public/evidence/manifest.json", import.meta.url), "utf8");
  const files = new Set();
  for (const text of [judge, readme, manifest]) {
    for (const match of text.matchAll(/(?:https:\/\/tidelight\.app)?(?:public)?\/evidence\/(authenticated-research-20261025(?:\/[A-Za-z0-9._-]+|\.zip))/g)) files.add(match[1]);
  }
  assert.ok(files.has("authenticated-research-20261025/installed-bridge.json"));
  assert.ok(files.has("authenticated-research-20261025.zip"));
  assert.ok(files.size >= 15);
  for (const file of files) await readFile(new URL(`../public/evidence/${file}`, import.meta.url));
  const hashes = await json("sha256.json");
  for (const file of files) if (!file.endsWith(".zip") && !file.endsWith("sha256.json")) assert.ok(hashes[file.split("/").at(-1)], `missing hash: ${file}`);
});
