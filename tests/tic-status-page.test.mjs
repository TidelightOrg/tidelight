import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolveStatusPagePath } from "../lib/tic/status-links.ts";

test("ecosystem status groups real service checks and labels unmonitored workloads", async () => {
  const page = await readFile(new URL("../app/status/page.tsx", import.meta.url), "utf8");
  const status = await readFile(new URL("../lib/tic/system-status.ts", import.meta.url), "utf8");
  for (const group of ["Websites", "APIs", "Package registries", "Data", "Background services"]) assert.ok(status.includes(`name: "${group}"`));
  for (const service of ["Tidelight app", "Developer docs", "Package directory", "REST API", "Research job API", "MCP server metadata", "npm registry", "Python package registry", "Application database"]) assert.ok(status.includes(`"${service}"`));
  assert.match(status, /state: "monitoring"/);
  assert.match(status, /Database monitoring is not configured for this deployment\./);
  assert.match(status, /if \(!process\.env\.NEXT_PUBLIC_SUPABASE_URL \|\| !\(process\.env\.SUPABASE_SECRET_KEY \|\| process\.env\.SUPABASE_SERVICE_ROLE_KEY\)\)/);
  assert.match(status, /state: error \? "degraded" : "operational"/);
  assert.match(page, /Not monitored/);
  assert.match(page, /Background job execution and message delivery are not monitored here/);
  assert.doesNotMatch(page, /\b(?:99\.\d+%|90-day uptime)\b/);
});

test("status navigation exposes current status, maintenance, and incident history", async () => {
  const page = await readFile(new URL("../app/status/page.tsx", import.meta.url), "utf8");
  const incidents = await readFile(new URL("../app/status/incidents/page.tsx", import.meta.url), "utf8");
  const maintenance = await readFile(new URL("../app/status/maintenance/page.tsx", import.meta.url), "utf8");
  assert.match(page, /href=\{maintenancePath\}/);
  assert.match(page, /href=\{incidentsPath\}/);
  assert.match(incidents, /history\.incidents\.map/);
  assert.match(maintenance, /no connected maintenance calendar/i);
});

test("status navigation resolves both the dedicated hostname and preview paths", () => {
  assert.equal(resolveStatusPagePath("status.tidelight.app", "/status"), "/");
  assert.equal(resolveStatusPagePath("status.tidelight.app", "/status/maintenance"), "/maintenance");
  assert.equal(resolveStatusPagePath("status.tidelight.app:443", "/status/incidents"), "/incidents");
  assert.equal(resolveStatusPagePath("tidelight-git-preview.vercel.app", "/status/maintenance"), "/status/maintenance");
});

test("dedicated status hostname rewrites its public routes to the status app", async () => {
  const config = await readFile(new URL("../next.config.ts", import.meta.url), "utf8");
  assert.match(config, /source: "\/", destination: "\/status"/);
  assert.match(config, /source: "\/incidents", destination: "\/status\/incidents"/);
  assert.match(config, /source: "\/maintenance", destination: "\/status\/maintenance"/);
  assert.match(config, /source: "\/health", destination: "\/api\/system\/health"/);
  assert.equal((config.match(/type: "host", value: "status\.tidelight\.app"/g) ?? []).length, 4);
});


test("all status routes bypass workspace chrome and the dedicated host skips account setup", async () => {
  const shell = await readFile(new URL("../app/ui/workspace-shell.tsx", import.meta.url), "utf8");
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(shell, /pathname\.startsWith\("\/status\/"\)/);
  assert.match(layout, /const isStandaloneStatusHost = requestHost === "status\.tidelight\.app"/);
  assert.match(layout, /const supabase = isStandalonePublicHost \? null : await createClient\(\)/);
  assert.match(layout, /const user = isStandalonePublicHost \? null : await getServerUser\(\)/);
});

test("service categories use native keyboard accordions and preserve unknown history", async () => {
  const page = await readFile(new URL("../app/status/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/status/status.css", import.meta.url), "utf8");
  assert.match(page, /<details className="tic-status-group"[^>]*open=\{group\.name === "Websites"\}/);
  assert.match(page, /<summary>/);
  assert.doesNotMatch(page, /role="button"|onClick=/);
  assert.match(page, /What these checks cover/);
  assert.match(page, /Background job execution and message delivery are not monitored here/);
  assert.match(page, /group\.services\.some\(service => service\.state === "degraded"\)/);
  assert.match(css, /summary:focus-visible/);
  assert.match(css, /max-width: 810px/);
  assert.match(css, /--status-bg: #101718/);
  assert.match(css, /@media \(max-width: 700px\)/);
  assert.doesNotMatch(page, /role="progressbar"|uptimePercent|uptimeBars/);
  assert.match(page, /90-day status history/);
  assert.match(page, /status\.history\.snapshots\.filter/);
  assert.match(page, /no recorded checks/);
});

test("rendered status preserves degraded database and native disclosure semantics", async () => {
  const { createRequire } = await import("node:module");
  const require = createRequire(import.meta.url);
  const ts = require("typescript");
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const source = await readFile(new URL("../app/status/page.tsx", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const fixture = {
    status: "degraded", checkedAt: "2026-10-25T00:00:00Z", components: {}, history: { snapshots: [], incidents: [], available: true },
    groups: [
      { name: "Websites", services: [{ name: "Tidelight app", state: "operational", detail: "HTTP 200" }] },
      { name: "Data", services: [{ name: "Application database", state: "degraded", detail: "Database query failed." }] },
      { name: "Background services", services: [{ name: "Job processing", state: "monitoring", detail: "Not probed" }] },
    ],
  };
  const renderedModule = { exports: {} };
  const load = name => {
    if (name === "next/headers") return {
      headers: async () => new Headers({ host: "status.tidelight.app" }),
      cookies: async () => ({ get: name => name === "tidelight-language" ? { value: "zh-CN" } : undefined }),
    };
    if (name === "next/link") return { default: props => React.createElement("a", props) };
    if (name === "@/lib/tic/system-status") return { getSystemStatus: async () => fixture };
    if (name === "@/lib/tic/status-links") return { resolveStatusPagePath };
    if (name === "./status.css") return {};
    return require(name);
  };
  new Function("require", "module", "exports", compiled)(load, renderedModule, renderedModule.exports);
  const html = renderToStaticMarkup(await renderedModule.exports.default());
  const expectedChecked = new Date(fixture.checkedAt).toLocaleString("zh-CN", { timeZone: "UTC", timeZoneName: "short" });
  assert.match(html, /A service is experiencing issues/);
  assert.ok(html.includes(expectedChecked));
  assert.match(html, /Database query failed\./);
  assert.match(html, /tic-status-state degraded/);
  assert.match(html, /tic-status-state monitoring/);
  assert.equal((html.match(/<details /g) ?? []).length, 3);
  assert.equal((html.match(/ open=""/g) ?? []).length, 1);
  assert.equal((html.match(/<summary>/g) ?? []).length, 3);
  assert.match(html, /href="\/maintenance"/);
  assert.match(html, /href="\/incidents"/);
  assert.doesNotMatch(html, /All monitored services operational|role="progressbar"/);
});


test("scheduled 90-day history uses the research worker bearer and accepts Supabase POST", async () => {
  const route = await readFile(new URL("../app/api/cron/status-history/route.ts", import.meta.url), "utf8");
  const migration = await readFile(new URL("../supabase/migrations/20261025120000_status_history.sql", import.meta.url), "utf8");
  assert.match(route, /TIC_RESEARCH_CRON_SECRET/);
  assert.match(route, /timingSafeEqual/);
  assert.match(route, /export const POST = GET/);
  assert.match(migration, /interval '90 days'/);
  assert.match(migration, /tic-status-history/);
});

test("status history is sourced from bounded server-side snapshots and incident records", async () => {
  const status = await readFile(new URL("../lib/tic/system-status.ts", import.meta.url), "utf8");
  assert.match(status, /tic_status_snapshots/);
  assert.match(status, /tic_status_incidents/);
  assert.match(status, /limit\(8640\)/);
  assert.match(status, /limit\(200\)/);
  assert.match(status, /includeHistory\?: boolean/);
  assert.match(status, /available: false/);
});
