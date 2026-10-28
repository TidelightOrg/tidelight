import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const files = {
  migration: new URL("../supabase/migrations/20261026190000_research_monitor_foundation.sql", import.meta.url),
  proxyAuthMigration: new URL("../supabase/migrations/20261026200000_research_monitor_proxy_auth.sql", import.meta.url),
  actions: new URL("../app/monitor/actions.ts", import.meta.url),
  route: new URL("../app/api/research/agent-flow/route.ts", import.meta.url),
  ui: new URL("../app/ui/research-monitor.tsx", import.meta.url),
  nav: new URL("../app/ui/workspace-shell.tsx", import.meta.url),
  evaluation: new URL("../docs/RESEARCH_MONITOR_EVALUATION.md", import.meta.url),
};

test("monitor schema enforces owner-linked immutable history and private tables", async () => {
  const sql = await readFile(files.migration, "utf8");
  assert.ok(sql.includes("foreign key (monitor_id, user_id) references public.research_monitors"));
  assert.ok(sql.includes("foreign key (research_run_id, user_id) references public.research_runs"));
  assert.ok(sql.includes("enable row level security"));
  assert.ok(sql.includes("revoke all on public.research_monitors") && sql.includes("authenticated"));
  assert.ok(sql.includes("grant execute on function public.create_research_monitor"));
  assert.ok(sql.includes("Owners append completed monitor observations"));
  assert.ok(sql.includes("grant insert on public.research_monitor_observations to authenticated"));
  assert.ok(sql.includes("active monitor limit reached"));
  assert.ok(sql.includes("thesis_revision = thesis_revision + 1"));
});

test("proxy-verified Monitor actions scope service-role access to the verified owner", async () => {
  const sql = await readFile(files.proxyAuthMigration, "utf8");
  assert.equal((sql.match(/auth\.role\(\) <> 'service_role'/g) ?? []).length, 3);
  assert.equal((sql.match(/p_user_id uuid/g) ?? []).length, 3);
  assert.ok(sql.includes("to service_role"));
  assert.ok(sql.includes("from public, anon, authenticated"));
  assert.ok(sql.includes("research_monitor_observations_research_run_id_idx"));
});

test("each monitor mutation authenticates and uses owner-aware database functions", async () => {
  const actions = await readFile(files.actions, "utf8");
  assert.equal(actions.split("getServerUser()").length - 1, 3);
  assert.equal(actions.split("p_user_id: user.id").length - 1, 3);
  assert.ok(actions.includes("createAdminClient()"));
  assert.match(actions, /create_research_monitor/);
  assert.match(actions, /update_research_monitor_thesis/);
  assert.match(actions, /set_research_monitor_status/);
  assert.ok(actions.includes("thesis.length < 12 || thesis.length > 440"));
});

test("Agent Flow attaches only an owned active monitor and records completed runs", async () => {
  const route = await readFile(files.route, "utf8");
  assert.ok(route.includes('.eq("id", monitorId).eq("user_id", user.id).eq("status", "active")'));
  assert.ok(route.includes("!tickers.includes(monitor.ticker)"));
  assert.ok(route.includes("research_monitor_observations"));
  assert.ok(route.includes("monitorObservationSaved"));
  assert.ok(route.includes("researchMonitorRevision?: unknown"));
  assert.ok(route.includes("expectedQuestion"));
  assert.ok(route.includes("thesis_revision: revision.revision"));
  assert.ok(route.includes("getServerAuthState()"));
  assert.ok(route.includes("createAdminClient()"));
  assert.ok(route.includes('.eq("user_id", user.id).gte("created_at", hourAgo)'));
});

test("monitor history pins the reviewed thesis revision and ticker-specific evidence", async () => {
  const flowPage = await readFile(new URL("../app/flow/page.tsx", import.meta.url), "utf8");
  const ui = await readFile(files.ui, "utf8");
  assert.ok(flowPage.includes("monitorRevision?: string"));
  assert.ok(flowPage.includes("research_monitor_thesis_revisions"));
  assert.ok(flowPage.includes("getServerUser()"));
  assert.ok(flowPage.includes("createAdminClient()"));
  assert.ok(ui.includes("assetFor(latest, monitor.ticker)"));
  assert.ok(ui.includes("sources(run?.summary, ticker)"));
  assert.ok(ui.includes("monitorRevision=${monitor.thesis_revision}"));
});

test("active monitors are independent of paginated archived monitors", async () => {
  const page = await readFile(new URL("../app/monitor/page.tsx", import.meta.url), "utf8");
  const ui = await readFile(files.ui, "utf8");
  assert.ok(page.includes('.eq("status", "active")'));
  assert.ok(page.includes("getServerUser()"));
  assert.ok(page.includes("createAdminClient()"));
  assert.ok(page.includes('.eq("status", "archived")'));
  assert.ok(page.includes("archivedPageSize"));
  assert.ok(ui.includes('aria-label="Archived monitor pages"'));
});

test("Monitor appears in desktop and mobile navigation", async () => {
  const nav = await readFile(files.nav, "utf8");
  assert.ok(nav.includes('href: "/monitor", label: "Research Monitor"'));
  assert.ok(nav.includes('<nav className="mobile-drawer-links" aria-label="Workspace sections">{visibleGroups.map'));
  assert.ok(nav.includes('aria-label="Workspace navigation"'));
});

test("evidence comparisons are described as outputs rather than verification", async () => {
  const ui = await readFile(files.ui, "utf8");
  const evaluation = await readFile(files.evaluation, "utf8");
  assert.ok(ui.includes("does not independently verify truth"));
  assert.ok(ui.includes("Model confidence"));
  assert.ok(ui.includes("Inspect {allSources.length} dated source links"));
  assert.ok(evaluation.includes("not a scored claim-accuracy result"));
  assert.ok(evaluation.includes("empty denominators explicitly"));
});
