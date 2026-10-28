import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type ServiceState = "operational" | "degraded" | "monitoring";
export type StatusService = { name: string; state: ServiceState; detail: string; href?: string };
export type StatusGroup = { name: string; services: StatusService[] };
export type StatusSnapshot = { sampledAt: string; overall: "operational" | "degraded"; components: Record<string, ServiceState> };
export type StatusIncident = { id: number; component: string; startedAt: string; resolvedAt: string | null; state: "investigating" | "resolved"; detail: string };
export type StatusHistory = { snapshots: StatusSnapshot[]; incidents: StatusIncident[]; available: boolean };
export type SystemStatus = {
  status: "operational" | "degraded";
  checkedAt: string;
  groups: StatusGroup[];
  components: Record<string, ServiceState>;
  history: StatusHistory;
};

async function probe(name: string, url: string, options: { expected?: number[]; href?: string; detail?: string } = {}): Promise<StatusService> {
  try {
    const response = await fetch(url, { method: "GET", headers: { Accept: "application/json,text/html,*/*" }, cache: "no-store", signal: AbortSignal.timeout(2500) });
    const expected = options.expected ?? [200];
    return { name, state: expected.includes(response.status) ? "operational" : "degraded", detail: expected.includes(response.status) ? (options.detail ?? `HTTP ${response.status}`) : `Unexpected HTTP ${response.status}`, ...(options.href ? { href: options.href } : {}) };
  } catch {
    return { name, state: "degraded", detail: "No response from this check.", ...(options.href ? { href: options.href } : {}) };
  }
}

async function checkDatabase(): Promise<StatusService> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    return { name: "Application database", state: "degraded", detail: "Database monitoring is not configured for this deployment.", href: "https://supabase.com" };
  }
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("developer_api_keys").select("id").limit(1);
    return { name: "Application database", state: error ? "degraded" : "operational", detail: error ? "Database query failed." : "Read-only query succeeded.", href: "https://supabase.com" };
  } catch {
    return { name: "Application database", state: "degraded", detail: "Database connection failed.", href: "https://supabase.com" };
  }
}

export async function getStatusHistory(): Promise<StatusHistory> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    return { snapshots: [], incidents: [], available: false };
  }
  try {
    const admin = createAdminClient();
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const [snapshotResult, incidentResult] = await Promise.all([
      admin.from("tic_status_snapshots").select("sampled_at,overall_state,components").gte("sampled_at", since).order("sampled_at", { ascending: true }).limit(8640),
      admin.from("tic_status_incidents").select("id,component,started_at,resolved_at,state,latest_detail").gte("started_at", since).order("started_at", { ascending: false }).limit(200),
    ]);
    if (snapshotResult.error || incidentResult.error) return { snapshots: [], incidents: [], available: false };
    const snapshots = (snapshotResult.data ?? []).map(row => ({
      sampledAt: row.sampled_at as string,
      overall: row.overall_state as StatusSnapshot["overall"],
      components: row.components as Record<string, ServiceState>,
    }));
    const incidents = (incidentResult.data ?? []).map(row => ({
      id: row.id as number,
      component: row.component as string,
      startedAt: row.started_at as string,
      resolvedAt: row.resolved_at as string | null,
      state: row.state as StatusIncident["state"],
      detail: row.latest_detail as string,
    }));
    return { snapshots, incidents, available: true };
  } catch {
    return { snapshots: [], incidents: [], available: false };
  }
}

async function checkBackgroundServices(): Promise<StatusService[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("get_tic_background_worker_status");
    if (error || !Array.isArray(data)) throw error ?? new Error("invalid_worker_health");
    return data.map((worker: { name: string; state: ServiceState; detail: string }) => ({
      name: worker.name,
      state: worker.state,
      detail: worker.detail,
    }));
  } catch {
    return [
      { name: "Research job processing", state: "degraded", detail: "Scheduler health could not be read." },
      { name: "Scheduled paper analysis", state: "degraded", detail: "Scheduler health could not be read." },
      { name: "Webhook delivery", state: "degraded", detail: "Scheduler health could not be read." },
      { name: "Email delivery", state: "degraded", detail: "Worker health could not be read." },
    ];
  }
}

export type StatusFeedEvent = { id: number; component: string; kind: "new" | "resolved"; occurredAt: string; detail: string };
type StatusFeedIncidentRow = { id: number; component: string; started_at: string; resolved_at: string | null; latest_detail: string };

export async function getStatusFeedEvents(): Promise<{ events: StatusFeedEvent[]; available: boolean }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    return { events: [], available: false };
  }
  try {
    const admin = createAdminClient();
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const starts: StatusFeedIncidentRow[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await admin.from("tic_status_incidents").select("id,component,started_at,resolved_at,latest_detail")
        .gte("started_at", since).order("started_at", { ascending: false }).order("id", { ascending: false }).range(offset, offset + 499);
      if (error) throw error;
      starts.push(...(data ?? []) as StatusFeedIncidentRow[]);
      if (!data || data.length < 500) break;
    }
    const resolutions: StatusFeedIncidentRow[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await admin.from("tic_status_incidents").select("id,component,started_at,resolved_at,latest_detail")
        .gte("resolved_at", since).not("resolved_at", "is", null).order("resolved_at", { ascending: false }).order("id", { ascending: false }).range(offset, offset + 499);
      if (error) throw error;
      resolutions.push(...(data ?? []) as StatusFeedIncidentRow[]);
      if (!data || data.length < 500) break;
    }
    const events = [
      ...starts.map(row => ({ id: row.id, component: row.component, kind: "new" as const, occurredAt: row.started_at, detail: "Observed degraded during scheduled check" })),
      ...resolutions.filter(row => row.resolved_at).map(row => ({ id: row.id, component: row.component, kind: "resolved" as const, occurredAt: row.resolved_at!, detail: row.latest_detail })),
    ].sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
    return { events, available: true };
  } catch {
    return { events: [], available: false };
  }
}

export async function getSystemStatus(options: { includeHistory?: boolean } = {}): Promise<SystemStatus> {
  const [application, docs, packages, api, researchJobs, mcp, npm, python, database, backgroundServices] = await Promise.all([
    probe("Tidelight app", "https://tidelight.app/", { href: "https://tidelight.app" }),
    probe("Developer docs", "https://dev.tidelight.app/", { href: "https://dev.tidelight.app" }),
    probe("Package directory", "https://package.tidelight.app/", { href: "https://package.tidelight.app" }),
    probe("REST API", "https://api.tidelight.app/v1", { href: "https://api.tidelight.app/v1" }),
    probe("Research job API", "https://api.tidelight.app/v1/research/jobs", { expected: [405], detail: "Route responds; starting a job requires an authenticated POST. No job was started.", href: "https://dev.tidelight.app/#research-jobs" }),
    probe("MCP server metadata", "https://mcp.tidelight.app/.well-known/oauth-protected-resource/mcp", { href: "https://dev.tidelight.app/#connect-with-the-mcp-server" }),
    probe("npm registry", "https://registry.npmjs.org/%40tidelight%2Fsdk", { href: "https://www.npmjs.com/org/tidelight" }),
    probe("Python package registry", "https://pypi.org/pypi/tidelight/json", { href: "https://pypi.org/project/tidelight/" }),
    checkDatabase(),
    checkBackgroundServices(),
  ]);

  const groups: StatusGroup[] = [
    { name: "Websites", services: [application, docs, packages] },
    { name: "APIs", services: [api, researchJobs, mcp] },
    { name: "Package registries", services: [npm, python] },
    { name: "Data", services: [database] },
    { name: "Background services", services: backgroundServices },
  ];
  const checked = groups.flatMap(group => group.services).filter(service => service.state !== "monitoring");
  const status = checked.every(service => service.state === "operational") ? "operational" : "degraded";
  const components = Object.fromEntries(groups.flatMap(group => group.services.map(service => [service.name, service.state])));
  const history = options.includeHistory === false ? { snapshots: [], incidents: [], available: false } : await getStatusHistory();
  return { status, checkedAt: new Date().toISOString(), groups, components, history };
}
