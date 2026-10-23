import { configuredAgentKey } from "@/lib/agentkey";
import { inspectAgentKeySearchDescription } from "@/lib/agentkey-flow-sources";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return Response.json({ error: "Use this check from your workspace." }, { status: 403 });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in to check the data source." }, { status: 401 });
  const client = configuredAgentKey();
  if (!client) return Response.json({ state: "not_configured" }, { status: 503 });
  // Reuse the authenticated, atomic two-per-hour provider diagnostic budget.
  const { data: checkId, error } = await supabase.rpc("reserve_ai_provider_check");
  if (error) return Response.json({ error: "Could not reserve a diagnostic." }, { status: 503 });
  if (!checkId) return Response.json({ error: "Provider checks are limited to twice per hour." }, { status: 429 });
  const started = Date.now();
  let state = "available";
  let failure = "";
  try {
    // Check the exact bounded search capability used by research, without a billable data query.
    const catalog = await client.findTools("Search dated public news headlines for a US listed company with attributable article links");
    if (!JSON.stringify(catalog).includes("agentkey_search")) throw new Error("research-search-tool-unavailable");
    const description = await client.describeTool("agentkey_search");
    if (!inspectAgentKeySearchDescription(description).withinBudget) throw new Error("research-search-cost-unverified");
  } catch (cause) {
    state = "unavailable";
    failure = cause instanceof Error ? cause.message : "agentkey-upstream";
  }
  const result = { provider: "agentkey", state, failure, requestMs: Date.now() - started, operation: "catalog discovery" };
  await supabase.from("ai_provider_checks").update({ status: "complete", result }).eq("id", checkId);
  return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
}
