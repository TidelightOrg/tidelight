import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { filterPersistableTokenPulseSources } from "../lib/token-pulse-sources.ts";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Overview token pulse stores news and community items using an allowed research source type", async () => {
  const route = await read("../app/api/research/token-pulse/route.ts");
  const schema = await read("../supabase/migrations/20261004104708_initial_tidelight_research_schema.sql");
  assert.match(schema, /source_type text not null default 'web' check \(source_type in \('web','market_data','filing','user_note'\)\)/);
  assert.match(route, /research_sources"\)\.upsert\(persistableItems\.map\(item => \(\{[\s\S]*?source_type: "web"/);
  assert.doesNotMatch(route, /source_type: item\.channel\.toLowerCase\(\)/);
  assert.match(route, /researchRunId/);
  assert.ok(route.indexOf("filterPersistableTokenPulseSources(gathered)") < route.indexOf("const unique = new Map"));
  assert.match(route, /omittedOversizedLinks/);
  assert.match(route, /No eligible recent sources remain[\s\S]*?omittedOversizedLinks/);
  assert.match(route, /2,000 UTF-8 bytes or 4,096 characters/);
});

test("an oversized Token Pulse source link is omitted while valid evidence remains persistable", () => {
  const sources = [
    { title: "valid", url: "https://example.com/release" },
    { title: "too long", url: `https://example.com/${"x".repeat(5_000)}` },
  ];
  const result = filterPersistableTokenPulseSources(sources);
  assert.deepEqual(result.items, [sources[0]]);
  assert.equal(result.omittedOversizedLinks, 1);
});

test("filters ineligible Token Pulse links before first-wins headline deduplication", async () => {
  const route = await read("../app/api/research/token-pulse/route.ts");
  assert.ok(route.indexOf("filterPersistableTokenPulseSources(gathered)") < route.indexOf("for (const item of eligibleCandidates)"));
  const longBytes = { title: "same", url: `https://example.com/${"é".repeat(1_100)}` };
  const filtered = filterPersistableTokenPulseSources([longBytes, { title: "same", url: "https://example.com/valid" }]);
  assert.equal(filtered.omittedOversizedLinks, 1);
  assert.deepEqual(filtered.items.map(item => item.url), ["https://example.com/valid"]);
});
