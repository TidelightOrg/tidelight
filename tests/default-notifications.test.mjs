import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("new accounts start with every email preference enabled without changing saved rows", async () => {
  const migration = await readFile(new URL("../supabase/migrations/20261025100000_default_notifications_enabled.sql", import.meta.url), "utf8");
  const route = await readFile(new URL("../app/api/nightwatch/preferences/route.ts", import.meta.url), "utf8");
  const ui = await readFile(new URL("../app/ui/notifications-center.tsx", import.meta.url), "utf8");
  for (const preference of ["nightwatch_analysis", "nightwatch_signals", "nightwatch_fills", "nightwatch_risks", "nightwatch_research", "nightwatch_daily_summary"]) {
    assert.match(migration, new RegExp(`alter column ${preference} set default true`));
    assert.match(migration, new RegExp(`${preference},?\\n`));
    assert.match(route, new RegExp(`${preference}: true`));
    assert.match(ui, new RegExp(`${preference}: true`));
  }
  assert.match(migration, /on conflict \(user_id\) do nothing/);
  assert.doesNotMatch(migration, /update public\.email_notification_preferences/i);
  assert.doesNotMatch(route, /emailRequested|RESEND_API_KEY.*status: 503/);
  assert.match(ui, /disabled=\{busy\}/);
});
