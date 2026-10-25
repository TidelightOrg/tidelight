import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type ServiceState = "operational" | "degraded" | "monitoring";
export type StatusService = {
  name: string;
  state: ServiceState;
  detail: string;
  href?: string;
};
export type StatusGroup = { name: string; services: StatusService[] };
export type SystemStatus = {
  status: "operational" | "degraded";
  checkedAt: string;
  groups: StatusGroup[];
  components: Record<string, ServiceState>;
};

async function probe(name: string, url: string, options: { expected?: number[]; href?: string; detail?: string } = {}): Promise<StatusService> {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json,text/html,*/*" },
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
    const expected = options.expected ?? [200];
    return {
      name,
      state: expected.includes(response.status) ? "operational" : "degraded",
      detail: expected.includes(response.status) ? (options.detail ?? `HTTP ${response.status}`) : `Unexpected HTTP ${response.status}`,
      ...(options.href ? { href: options.href } : {}),
    };
  } catch {
    return { name, state: "degraded", detail: "No response from this check.", ...(options.href ? { href: options.href } : {}) };
  }
}

async function checkDatabase(): Promise<StatusService> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    return { name: "Application database", state: "monitoring", detail: "Database monitoring is not configured for this deployment.", href: "https://supabase.com" };
  }
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("developer_api_keys").select("id").limit(1);
    return { name: "Application database", state: error ? "degraded" : "operational", detail: error ? "Database query failed." : "Read-only query succeeded.", href: "https://supabase.com" };
  } catch {
    return { name: "Application database", state: "degraded", detail: "Database connection failed.", href: "https://supabase.com" };
  }
}

export async function getSystemStatus(): Promise<SystemStatus> {
  const origin = "https://tidelight.app";
  const [application, docs, packages, api, researchJobs, mcp, npm, python, database] = await Promise.all([
    probe("Tidelight app", "https://tidelight.app/", { href: "https://tidelight.app" }),
    probe("Developer docs", "https://dev.tidelight.app/", { href: "https://dev.tidelight.app" }),
    probe("Package directory", "https://package.tidelight.app/", { href: "https://package.tidelight.app" }),
    probe("REST API", "https://api.tidelight.app/v1", { href: "https://api.tidelight.app/v1" }),
    probe("Research job API", "https://api.tidelight.app/v1/research/jobs", { expected: [405], detail: "Route responds; starting a job requires an authenticated POST. No job was started.", href: "https://dev.tidelight.app/#research-jobs" }),
    probe("MCP server metadata", "https://mcp.tidelight.app/.well-known/oauth-protected-resource/mcp", { href: "https://dev.tidelight.app/#connect-with-the-mcp-server" }),
    probe("npm registry", "https://registry.npmjs.org/%40tidelight%2Fsdk", { href: "https://www.npmjs.com/org/tidelight" }),
    probe("Python package registry", "https://pypi.org/pypi/tidelight/json", { href: "https://pypi.org/project/tidelight/" }),
    checkDatabase(),
  ]);

  const groups: StatusGroup[] = [
    { name: "Websites", services: [application, docs, packages] },
    { name: "APIs", services: [api, researchJobs, mcp] },
    { name: "Package registries", services: [npm, python] },
    { name: "Data", services: [database] },
    {
      name: "Background services",
      services: [
        { name: "Research job processing", state: "monitoring", detail: "Job execution history is available in the developer console; this page does not run a job." },
        { name: "Scheduled research", state: "monitoring", detail: "Scheduler configuration is available through the system health endpoint; executions are not probed here.", href: `${origin}/api/system/health` },
        { name: "Webhook and email delivery", state: "monitoring", detail: "Delivery health is visible in the owner-scoped developer console." },
      ],
    },
  ];
  const checked = groups.flatMap(group => group.services).filter(service => service.state !== "monitoring");
  const status = checked.every(service => service.state === "operational") ? "operational" : "degraded";
  const components = Object.fromEntries(groups.flatMap(group => group.services.map(service => [service.name, service.state])));
  return { status, checkedAt: new Date().toISOString(), groups, components };
}
