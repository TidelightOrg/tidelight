import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("indexes cover every foreign key flagged by the production advisor", async () => {
  const sql = (await readFile(new URL("../supabase/migrations/20261122120000_index_uncovered_foreign_keys.sql", import.meta.url), "utf8")).replace(/\s+/g, " ");
  const indexes = [
    ["decision_capsules_research_run_owner_fk_idx", "public.decision_capsules (research_run_id, user_id)"],
    ["public_nightwatch_replays_order_fk_idx", "public.public_nightwatch_replays (order_id)"],
    ["public_research_replays_run_fk_idx", "public.public_research_replays (research_run_id)"],
    ["research_monitor_observations_monitor_owner_fk_idx", "public.research_monitor_observations (monitor_id, user_id)"],
    ["research_monitor_observations_run_owner_fk_idx", "public.research_monitor_observations (research_run_id, user_id)"],
    ["research_monitor_thesis_revisions_monitor_owner_fk_idx", "public.research_monitor_thesis_revisions (monitor_id, user_id)"],
  ];

  for (const [name, target] of indexes) {
    assert.ok(sql.includes(`create index if not exists ${name} on ${target};`), name);
  }
  assert.equal((sql.match(/create index if not exists/gi) ?? []).length, indexes.length);
});
