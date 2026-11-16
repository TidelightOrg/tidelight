import "server-only";

import { configuredAgentKey, type AgentKeyClient } from "./agentkey";
import { gatherAgentKeyResearch, inspectAgentKeyResearchCost, type AgentKeyResearch, type AgentKeySource } from "./agentkey-research";
import { issuerEvidenceLookbackDays, type FlowEvidence } from "./agent-flow-sources";

export { inspectAgentKeyResearchCost as inspectAgentKeySearchDescription };

const MAX_CURRENT_AGE_MS = 30 * 86_400_000;
const MAX_HISTORICAL_AGE_MS = 365 * 86_400_000;

function safeIssuerEvidence(source: AgentKeySource, ticker: string, issuer: string, question: string, now: number): FlowEvidence | null {
  const publishedAt = source.publishedAt ? Date.parse(source.publishedAt) : NaN;
  const maxAge = issuerEvidenceLookbackDays(question) > 30 ? MAX_HISTORICAL_AGE_MS : MAX_CURRENT_AGE_MS;
  if (!Number.isFinite(publishedAt) || publishedAt > now + 300_000 || now - publishedAt > maxAge) return null;
  const excerpt = `${source.title} ${source.snippet}`;
  if (!new RegExp(`(^|[^a-z0-9])${ticker}([^a-z0-9]|$)`, "i").test(excerpt) && !excerpt.toLowerCase().includes(issuer.toLowerCase())) return null;
  return { title: source.title, url: source.url, publisher: source.publisher, publishedAt: source.publishedAt, snippet: source.snippet.slice(0, 400), via: "AgentKey" };
}

export type AgentKeyIssuerResearch = { sources: FlowEvidence[]; context: string; tools: AgentKeyResearch["tools"] };

/** One bounded AgentKey discovery pass, retaining bounded tool data for synthesis and attributable headlines for citations. */
export async function agentKeyIssuerResearch(
  ticker: string,
  issuer: string,
  client: Pick<AgentKeyClient, "findTools" | "describeTool" | "executeTool"> | null = configuredAgentKey(2_500, 10_000),
  question = `Find recent news about ${issuer} (${ticker}), including earnings, guidance, and market reaction.`,
): Promise<AgentKeyIssuerResearch> {
  const empty = (): AgentKeyIssuerResearch => ({ sources: [], context: "", tools: [] });
  if (!client || !/^[A-Z]{1,6}$/.test(ticker)) return empty();
  const query = `${question.slice(0, 360)} Include public, dated, attributable sources for ${issuer} (${ticker}).`;
  const research = await gatherAgentKeyResearch(query, client, ticker);
  if (research.state !== "used") return empty();
  const now = Date.now();
  const sources = research.sources.flatMap(source => {
    const evidence = safeIssuerEvidence(source, ticker, issuer, question, now);
    return evidence ? [evidence] : [];
  }).slice(0, 20);
  return { sources, context: research.context, tools: research.tools };
}

export async function agentKeyIssuerEvidence(
  ticker: string,
  issuer: string,
  client: Pick<AgentKeyClient, "findTools" | "describeTool" | "executeTool"> | null = configuredAgentKey(2_500, 10_000),
  question = `Find recent news about ${issuer} (${ticker}), including earnings, guidance, and market reaction.`,
): Promise<FlowEvidence[]> {
  return (await agentKeyIssuerResearch(ticker, issuer, client, question)).sources;
}
