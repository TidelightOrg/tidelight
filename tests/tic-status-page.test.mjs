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
  assert.match(page, /Not monitored/);
  assert.match(page, /Historical uptime bars and incident timelines will appear after scheduled monitoring is in place/);
  assert.doesNotMatch(page, /\b(?:99\.\d+%|90-day uptime)\b/);
});

test("status navigation exposes current status, maintenance, and incident history", async () => {
  const page = await readFile(new URL("../app/status/page.tsx", import.meta.url), "utf8");
  const incidents = await readFile(new URL("../app/status/incidents/page.tsx", import.meta.url), "utf8");
  const maintenance = await readFile(new URL("../app/status/maintenance/page.tsx", import.meta.url), "utf8");
  assert.match(page, /href=\{maintenancePath\}/);
  assert.match(page, /href=\{incidentsPath\}/);
  assert.match(incidents, /Incident archive not connected/);
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
  assert.match(layout, /const supabase = isStandalonePublicHost \\? null : await createClient\\(\\)/);
  assert.match(layout, /const user = isStandalonePublicHost \\? null : await getServerUser\\(\\)/);
});
