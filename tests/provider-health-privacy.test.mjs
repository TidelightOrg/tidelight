import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

test("provider health storage contains only bounded operational metadata", async () => {
  const [migration, writer, page] = await Promise.all([
    readFile(new URL("supabase/migrations/20261028204758_research_provider_health_events.sql", root), "utf8"),
    readFile(new URL("lib/provider-health.ts", root), "utf8"),
    readFile(new URL("app/operator/provider-health/page.tsx", root), "utf8"),
  ]);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /from public, anon, authenticated/i);
  assert.match(migration, /to service_role/i);
  assert.match(migration, /occurred_at < now\(\) - interval '180 days'/i);
  for (const forbidden of ["user_id", "research_run_id", "question", "prompt", "response", "content"]) {
    assert.equal(new RegExp(`\\b${forbidden}\\b`, "i").test(migration), false, `schema must not include ${forbidden}`);
  }
  assert.doesNotMatch(writer, /user_id\s*:|research_run_id\s*:|question\s*:/i);
  assert.doesNotMatch(page, /from\(["']research_runs["']\)/i);
  assert.match(page, /isTidelightOperator\(user\)/);
  assert.match(page, /get_research_provider_health/);
});

test("provider health migration exposes only a service-role aggregate RPC", async () => {
  const migration = await readFile(new URL("supabase/migrations/20261028204758_research_provider_health_events.sql", root), "utf8");
  assert.match(migration, /security definer/i);
  assert.match(migration, /set search_path = ''/i);
  assert.match(migration, /revoke all on function public\.get_research_provider_health\(integer\) from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.get_research_provider_health\(integer\) to service_role/i);
  assert.match(migration, /least\(coalesce\(p_days, 30\), 180\)/i);
  assert.match(migration, /percentile_cont\(0\.95\)/i);
});
