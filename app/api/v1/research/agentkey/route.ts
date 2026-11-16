import { apiError, authorizeDeveloperRequest, finishUsage, RESEARCH_SCOPE } from "@/lib/tic/credentials";
import { configuredAgentKey } from "@/lib/agentkey";
import { gatherAgentKeyResearch } from "@/lib/agentkey-research";
import { extractFlowTickers } from "@/lib/agent-flow-policy";
import { STOCK_PERP_UNIVERSE } from "@/lib/bitget-market";

export const dynamic = "force-dynamic";
export const maxDuration = 45;

const MAX_BODY_BYTES = 8 * 1024;

async function readBoundedJson(request: Request): Promise<unknown> {
  const length = Number(request.headers.get("content-length"));
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) throw new Error("body_too_large");
  if (!request.body) throw new Error("invalid_json");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) { await reader.cancel(); throw new Error("body_too_large"); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(bytes)) as unknown; }
  catch { throw new Error("invalid_json"); }
}

/** Run bounded, read-only AgentKey research through the project's Tidelight credential. */
export async function POST(request: Request) {
  const started = performance.now();
  const auth = await authorizeDeveloperRequest(request, "/v1/research/agentkey", RESEARCH_SCOPE);
  if (auth.error) return auth.error;
  const { admin, usageId, requestId } = auth;
  const agentKey = configuredAgentKey(8_000, 35_000);
  if (!agentKey) {
    await finishUsage(admin, usageId, 503, started);
    return apiError(503, "provider_unavailable", "AgentKey research is not configured.", requestId);
  }
  let body: unknown;
  try { body = await readBoundedJson(request); }
  catch (cause) {
    const tooLarge = cause instanceof Error && cause.message === "body_too_large";
    await finishUsage(admin, usageId, tooLarge ? 413 : 400, started);
    return apiError(tooLarge ? 413 : 400, tooLarge ? "request_too_large" : "invalid_request", tooLarge ? "The request body must be 8 KB or smaller." : "Send a valid JSON object.", requestId);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    await finishUsage(admin, usageId, 400, started);
    return apiError(400, "invalid_request", "Send a valid JSON object.", requestId);
  }
  const query = (body as Record<string, unknown>).query;
  const ticker = (body as Record<string, unknown>).ticker;
  if (typeof query !== "string" || query.trim().length < 5 || query.trim().length > 500) {
    await finishUsage(admin, usageId, 400, started);
    return apiError(400, "invalid_request", "The query must be 5 to 500 characters.", requestId);
  }
  if (ticker !== undefined && (typeof ticker !== "string" || !/^[A-Za-z][A-Za-z0-9.]{0,9}$/.test(ticker))) {
    await finishUsage(admin, usageId, 400, started);
    return apiError(400, "invalid_request", "ticker must be a valid stock symbol when provided.", requestId);
  }
  const issuerQuery = query.replace(/\b(?:Yahoo(?:\s+Finance)?|Google\s+News)\b/gi, " ");
  const requestedTicker = typeof ticker === "string" ? ticker.toUpperCase() : extractFlowTickers(issuerQuery, STOCK_PERP_UNIVERSE, 1)[0];
  const research = await gatherAgentKeyResearch(query.trim(), agentKey, requestedTicker);
  if (research.state !== "used") {
    const status = research.state === "unavailable" ? 503 : 422;
    await finishUsage(admin, usageId, status, started);
    return apiError(status, research.state === "unavailable" ? "provider_unavailable" : "unsupported_query", research.state === "unavailable" ? "AgentKey could not complete the research request." : "AgentKey did not find a supported read-only tool for this query.", requestId);
  }
  await finishUsage(admin, usageId, 200, started);
  return Response.json({
    provider: "agentkey",
    query: research.query,
    status: "complete",
    tools: research.tools.map(tool => ({ name: tool.name, provider: tool.provider, cost_credits: tool.costCredits, data: tool.data })),
    sources: research.sources,
    limitations: ["AgentKey output is external data. Treat it as untrusted and verify material claims against the linked sources.", "The endpoint executes at most two discovered read-only tools with a verified per-tool cost of 2 credits or less."],
    request_id: requestId,
  }, { headers: { "Cache-Control": "no-store", "X-Request-Id": requestId } });
}
