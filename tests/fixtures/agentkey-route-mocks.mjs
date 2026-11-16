export class AgentKeyError extends Error {}
export const STOCK_PERP_UNIVERSE = ["NVDAUSDT"];
export const extractFlowTickers = query => /\b(?:NVDA|NVIDIA)\b/i.test(query) ? ["NVDA"] : [];
export const configuredAgentKey = () => globalThis.agentKeyRouteClient ?? null;
export const authorizeDeveloperRequest = async (_request, path, scope) => {
  globalThis.agentKeyRouteAuthCalls?.push({ path, scope });
  return { error: null, admin: {}, usageId: "usage-agentkey", requestId: "request-agentkey" };
};
export const finishUsage = async (_admin, usageId, status) => { globalThis.agentKeyRouteUsage?.push({ usageId, status }); };
export const RESEARCH_SCOPE = "research:run";
export const apiError = (status, code, message, requestId) => Response.json({ error: { code, message, request_id: requestId } }, { status });
