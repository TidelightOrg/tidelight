import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";

const modules = {
  "@/lib/supabase/admin": 'export const createAdminClient=()=>globalThis.statusTest.admin;',
  "@/lib/tic/system-status": 'export const getSystemStatus=async()=>globalThis.statusTest.status;',
  "@/lib/tic/status-notifications": 'export const notifyStatusSubscribers=async()=>({sent:0,skipped:true});',
};
const hook = registerHooks({ resolve(specifier, context, next) {
  if (specifier === "next/server") return { url: `data:text/javascript,${encodeURIComponent('export const NextResponse={json:(body,init={})=>new Response(JSON.stringify(body),init)};')}`, shortCircuit: true };
  if (modules[specifier]) return { url: `data:text/javascript,${encodeURIComponent(modules[specifier])}`, shortCircuit: true };
  return next(specifier, context);
} });
const { GET, POST } = await import("../app/api/cron/status-history/route.ts");
hook.deregister();

function setup(error = null) {
  const calls = [];
  globalThis.statusTest = {
    status: { status: "degraded", components: { "Tidelight app": "operational", "REST API": "degraded", "Background worker": "monitoring" }, history: { snapshots: [], incidents: [], available: true } },
    admin: { rpc: async (name, args) => { calls.push({ name, args }); return { data: { sampleSlot: "2026-10-25T12:00:00Z", createdIncidents: 1, resolvedIncidents: 0 }, error }; } },
  };
  process.env.TIC_RESEARCH_CRON_SECRET = "status-secret";
  return calls;
}
const request = token => new Request("https://tidelight.app/api/cron/status-history", { headers: token ? { authorization: `Bearer ${token}` } : {} });
const postRequest = token => new Request("https://tidelight.app/api/cron/status-history", { method: "POST", headers: token ? { authorization: `Bearer ${token}` } : {} });

test("status history worker rejects missing/incorrect authorization before probing or recording", async () => {
  setup();
  for (const token of [undefined, "wrong"]) assert.equal((await GET(request(token))).status, 401);
});

test("status history worker records actual observed component states through the privileged RPC", async () => {
  const calls = setup();
  const response = await GET(request("status-secret"));
  assert.equal(response.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, "record_tic_status_snapshot");
  assert.equal(calls[0].args.p_overall, "degraded");
  assert.equal(calls[0].args.p_components["REST API"], "degraded");
  assert.equal(calls[0].args.p_components["Background worker"], "monitoring");
});

test("database history keeps 90 days, quarter-hour slots, private reads, and observed-state-only incidents", async () => {
  const sql = await readFile(new URL("../supabase/migrations/20261027205032_tic_status_history.sql", import.meta.url), "utf8");
  assert.match(sql, /date_bin\('15 minutes'/);
  assert.match(sql, /interval '90 days'/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /on conflict \(sample_slot\)/);
  assert.match(sql, /Observed degraded during scheduled check/);
  assert.match(sql, /Operational at latest scheduled check/);
  assert.match(sql, /tic-status-history/);
  assert.match(sql, /tic_research_worker_url/);
  assert.match(sql, /tic_research_worker_secret/);
  assert.match(sql, /regexp_replace\(worker_url,'\/api\/cron\/tic-research\//);
  assert.doesNotMatch(sql, /tic_status_worker_(?:url|secret)/);
});

test("database write failures are reported without exposing details", async () => {
  setup({ message: "sensitive database internals" });
  const response = await GET(request("status-secret"));
  assert.equal(response.status, 503);
  assert.equal((await response.text()).includes("sensitive"), false);
});


test("Supabase POST records a scheduled status snapshot", async () => {
  const calls = setup();
  const response = await POST(postRequest("status-secret"));
  assert.equal(response.status, 200);
  assert.equal(calls.length, 1);
});
