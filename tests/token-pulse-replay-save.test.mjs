import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Overview token pulse stores news and community items using an allowed research source type", async () => {
  const route = await read("../app/api/research/token-pulse/route.ts");
  const schema = await read("../supabase/migrations/20261004104708_initial_tidelight_research_schema.sql");
  assert.match(schema, /source_type text not null default 'web' check \(source_type in \('web','market_data','filing','user_note'\)\)/);
  assert.match(route, /research_sources"\)\.upsert\(items\.map\(item => \(\{[\s\S]*?source_type: "web"/);
  assert.doesNotMatch(route, /source_type: item\.channel\.toLowerCase\(\)/);
  assert.match(route, /researchRunId/);
});
