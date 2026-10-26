import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const files = {
  migration: new URL("../supabase/migrations/20261026190000_research_monitor_foundation.sql", import.meta.url),
  page: new URL("../app/monitor/page.tsx", import.meta.url),
  actions: new URL("../app/monitor/actions.ts", import.meta.url),
  route: new URL("../app/api/research/agent-flow/route.ts", import.meta.url),
  desk: new URL("../app/ui/agent-flow-desk.tsx", import.meta.url),
  ui: new URL("../app/ui/research-monitor.tsx", import.meta.url),
  nav: new URL("../app/ui/workspace-shell.tsx", import.meta.url),
  evaluation: new URL("../docs/RESEARCH_MONITOR_EVALUATION.md", import.meta.url),
};

test("monitor schema enforces owner-linked immutable history and keeps tables private", async () => {
  const sql = await readFile(files.migration, "utf8");
  assert.match(sql, /foreign key \(monitor_id, user_id\).*research_monitors/s);
  assert.match(sql, /foreign key \(research_run_id, user_id\).*research_runs/s);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /revoke all on public\.research_monitors.*authenticated/);
  assert.match(sql, /grant execute on function public\.create_research_monitor/);
  assert.match(sql, /active monitor limit reached/);
  assert.match(sql, /thesis_revision=thesis_revision\+1/);
});

test("monitor server actions authenticate, validate, and mutate through owner-aware RPCs", async () => {
  const actions = await readFile(files.actions, "utf8");
  assert.equal((actions.match(/getServerUser\(\)/g) ?? []).length, 3);
  assert.match(actions, /create_research_monitor/);
  assert.match(actions, /update_research_monitor_thesis/);
  assert.match(actions, /set_research_monitor_status/);
  assert.match(actions, /12 \|\| thesis.length > 800/);
});

test("agent-flow attaches only an owned active monitor and persists completed runs", async () => {
  const route = await readFile(files.route, "utf8");
  assert.match(route, /\.eq\("user_id", user\.id\).*\.eq\("status", "active"\)/);
  assert.match(route, /!tickers\.includes\(monitor\.ticker\)/);
  assert.match(route, /research_monitor_observations/);
  assert.match(route, /monitorObservationSaved/);
  assert.match(route, /\.eq\("user_id", user\.id\);\n        if \(saveError\)/);
});

test("Monitor entry points appear in primary and mobile navigation", async () => {
  const nav = await readFile(files.nav, "utf8");
  assert.match(nav, /href: "\/monitor", label: "Research Monitor"/);
  assert.match(nav, /href: "\/monitor", label: "Monitor"/);
});

test("Monitor shows saved source and delta limitations without calling confidence an accuracy score", async () => {
  const ui = await readFile(files.ui, "utf8");
  const evaluation = await readFile(files.evaluation, "utf8");
  assert.match(ui, /does not independently verify truth or editorial independence/);
  assert.match(ui, /Model confidence/);
  assert.match(ui, /Inspect \{runSources\.length\} source links/);
  assert.match(ui, /thesis_revision/);
  assert.match(evaluation, /not a scored claim accuracy result/);
  assert.match(evaluation, /empty-denominator/);
});
