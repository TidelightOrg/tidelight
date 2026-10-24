import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

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
  assert.match(page, /href="\/maintenance"/);
  assert.match(page, /href="\/incidents"/);
  assert.match(incidents, /Incident archive not connected/);
  assert.match(maintenance, /no connected maintenance calendar/i);
});
