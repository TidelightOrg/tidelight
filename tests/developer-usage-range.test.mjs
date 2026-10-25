import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseUsageRangeDays } from "../lib/tic/usage-range.ts";

test("developer usage exposes only ranges supported by the analytics window", () => {
  assert.equal(parseUsageRangeDays("7"), 7);
  assert.equal(parseUsageRangeDays("30"), 30);
  assert.equal(parseUsageRangeDays("90"), 90);
  assert.equal(parseUsageRangeDays("invalid"), 30);
  assert.equal(parseUsageRangeDays(null), 30);
});

test("90-day usage stays service-role-only and validates a bounded 90-day range", async () => {
  const sql = await readFile(new URL("../supabase/migrations/20261025120000_extend_tic_usage_analytics_to_90_days.sql", import.meta.url), "utf8");
  assert.match(sql, /p_to - p_from > interval '90 days'/);
  assert.match(sql, /grant execute .* to service_role/i);
  assert.match(sql, /revoke all .* from public, anon, authenticated/i);
  assert.match(sql, /r\.project_id = any\(p_project_ids\)/);
});
