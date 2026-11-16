import "server-only";

import { AgentKeyError, configuredAgentKey, type AgentKeyClient } from "@/lib/agentkey";

const MAX_QUERY_LENGTH = 500;
const MAX_RESULTS = 2;
const MAX_DESCRIBED_CANDIDATES = 8;
const MAX_CREDITS_PER_TOOL = 2;
const MAX_CREDITS_PER_QUERY = 4;
const MAX_RESULT_BYTES = 30_000;
const MAX_CONTEXT = 8_000;
const TOOL_NAME = /^[A-Za-z][A-Za-z0-9_.-]{0,79}\/[A-Za-z][A-Za-z0-9_.-]{0,119}$/;
const MUTATING = /\b(?:write|create|update|delete|remove|post|publish|comment|like|follow|subscribe|unsubscribe|trade|order|transfer|withdraw|deposit|purchase|payment|wallet|credential|api.?key|buy|sell|execute|submit|send|place|cancel|close|open|activate|deactivate|enable|disable|set|modify|edit)\b/i;
const RESEARCH_TOOL = /\b(?:search|news|quote|chart|history|earnings|finance|financial|research|web|stock|market|fundamental)\b/i;

type RecordValue = Record<string, unknown>;
type ToolCandidate = { name: string; summary: string };
type ToolResult = { name: string; provider: string; costCredits: number; data: unknown };
export type AgentKeySource = { title: string; url: string; publisher: string; publishedAt: string | null; snippet: string; via: "AgentKey"; tool: string };
export type AgentKeyResearch = {
  state: "used" | "unavailable" | "unsupported";
  query: string;
  tools: ToolResult[];
  sources: AgentKeySource[];
  context: string;
};

function asRecord(value: unknown): RecordValue | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : null;
}

function parseText(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try { return JSON.parse(trimmed) as unknown; } catch { return trimmed; }
}

/** MCP results commonly wrap their JSON payload in one or more text content blocks. */
function unwrap(value: unknown, depth = 0): unknown {
  if (depth > 16) return value;
  if (typeof value === "string") return parseText(value);
  if (Array.isArray(value)) return value;
  const object = asRecord(value);
  if (!object) return value;
  if (Object.prototype.hasOwnProperty.call(object, "structuredContent")) return unwrap(object.structuredContent, depth + 1);
  if (Array.isArray(object.content)) {
    const payloads = object.content.flatMap(entry => {
      const item = asRecord(entry);
      return item && (item.type === "text" || typeof item.text === "string") && typeof item.text === "string" ? [unwrap(item.text, depth + 1)] : [];
    });
    if (payloads.length === 1) return payloads[0];
    if (payloads.length > 1) return payloads;
  }
  return value;
}

function collectTools(value: unknown, into: Map<string, ToolCandidate>, depth = 0) {
  if (depth > 7 || into.size >= 40) return;
  const parsed = unwrap(value);
  if (Array.isArray(parsed)) { for (const item of parsed) collectTools(item, into, depth + 1); return; }
  const object = asRecord(parsed);
  if (object) {
    const name = [object.name, object.tool, object.fullName, object.full_name].find(item => typeof item === "string");
    if (typeof name === "string" && (TOOL_NAME.test(name) || name.toLowerCase() === "agentkey_search")) {
      const summary = [object.summary, object.description, object.title].filter(item => typeof item === "string").join(" ").slice(0, 1_500);
      into.set(name, { name, summary });
    }
    for (const [key, child] of Object.entries(object)) {
      if (["content", "name", "tool", "fullName", "full_name", "summary", "description", "title"].includes(key)) continue;
      collectTools(child, into, depth + 1);
    }
    return;
  }
  if (typeof parsed === "string") {
    for (const match of parsed.matchAll(/\bagentkey_search\b/gi)) {
      into.set("agentkey_search", { name: "agentkey_search", summary: parsed.slice(Math.max(0, match.index! - 180), match.index! + match[0].length + 280) });
    }
    for (const match of parsed.matchAll(/[A-Za-z][A-Za-z0-9_.-]{0,79}\/[A-Za-z][A-Za-z0-9_.-]{0,119}/g)) {
      if (TOOL_NAME.test(match[0]) || match[0].toLowerCase() === "agentkey_search") into.set(match[0], { name: match[0], summary: parsed.slice(Math.max(0, match.index! - 180), match.index! + match[0].length + 280) });
    }
  }
}

function candidatesFrom(discovery: unknown): ToolCandidate[] {
  const candidates = new Map<string, ToolCandidate>();
  collectTools(discovery, candidates);
  return [...candidates.values()];
}

export function agentKeyResearchCandidates(discovery: unknown, query = "") {
  return candidatesFrom(discovery).filter(candidate => (candidate.name.toLowerCase() === "agentkey_search" || readOnly(candidate)) && providerMatch(candidate, query));
}

function readOnly(candidate: ToolCandidate) {
  const description = `${candidate.name} ${candidate.summary}`.toLowerCase().replace(/[_-]+/g, " ");
  return RESEARCH_TOOL.test(description) && !MUTATING.test(description);
}

function describedAsMutating(description: unknown) {
  const operationText: string[] = [];
  const schemaKeys = /^(?:inputSchema|input_schema|parameters|schema|argsSchema|args_schema|execute_as|properties|required|enum|items|type|format|additionalProperties)$/i;
  function collect(value: unknown, depth = 0) {
    if (depth > 8) return;
    if (typeof value === "string") { operationText.push(value); return; }
    if (Array.isArray(value)) { for (const child of value) collect(child, depth + 1); return; }
    const object = asRecord(value);
    if (!object) return;
    for (const [key, child] of Object.entries(object)) {
      if (schemaKeys.test(key)) continue;
      operationText.push(key);
      collect(child, depth + 1);
    }
  }
  collect(unwrap(description));
  return MUTATING.test(operationText.join(" ").toLowerCase().replace(/[_-]+/g, " "));
}

function providerMatch(candidate: ToolCandidate, query: string) {
  const name = `${candidate.name} ${candidate.summary}`.toLowerCase();
  const asksGoogleNews = /\bgoogle\s+news\b/i.test(query);
  const asksYahoo = /\byahoo(?:\s+finance)?\b|\byfinance\b/i.test(query);
  if (asksGoogleNews && asksYahoo) {
    const googleNews = /google.{0,16}news|news.{0,16}google/.test(name);
    const yahoo = /yahoo|yfinance/.test(name);
    return googleNews || yahoo;
  }
  if (asksGoogleNews) return /google.{0,16}news|news.{0,16}google/.test(name);
  if (asksYahoo) return /yahoo|yfinance/.test(name);
  return true;
}

function numericCost(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
  if (typeof value === "string") {
    const match = /^(\d+(?:\.\d+)?)\s*(?:credits?)?$/i.exec(value.trim());
    if (match) return Number(match[1]);
  }
  return null;
}

function costCredits(description: unknown): number | null {
  let found: number | null = null;
  function visit(value: unknown, depth = 0) {
    if (depth > 7 || found !== null) return;
    const object = asRecord(value);
    if (object) {
      for (const [key, child] of Object.entries(object)) {
        if (/^(?:cost|cost_credits|credits_per_call|credit_cost)$/i.test(key)) {
          found = numericCost(child);
          if (found !== null) return;
        }
      }
      for (const child of Object.values(object)) visit(child, depth + 1);
    } else if (Array.isArray(value)) for (const child of value) visit(child, depth + 1);
    else if (typeof value === "string") {
      const match = /\b(?:cost|price)\s*:?\s*(\d+(?:\.\d+)?)\s*credits?\b/i.exec(value);
      if (match) found = Number(match[1]);
    }
  }
  visit(unwrap(description));
  return found;
}

function findSchema(value: unknown, depth = 0): RecordValue | null {
  if (depth > 8) return null;
  const object = asRecord(value);
  if (!object) {
    if (Array.isArray(value)) for (const child of value) { const match = findSchema(child, depth + 1); if (match) return match; }
    return null;
  }
  if (asRecord(object.properties)) return object;
  for (const [key, child] of Object.entries(object)) {
    if (/^(?:inputSchema|input_schema|parameters|schema|argsSchema|args_schema|execute_as)$/i.test(key)) {
      const match = findSchema(child, depth + 1);
      if (match) return match;
    }
  }
  for (const child of Object.values(object)) { const match = findSchema(child, depth + 1); if (match) return match; }
  return null;
}

function enumValue(property: RecordValue, preferred: unknown, requireMatch = false) {
  const values = Array.isArray(property.enum) ? property.enum.filter(item => typeof item === "string" || typeof item === "number") : [];
  if (!values.length) return preferred;
  const match = values.find(item => String(item).toLowerCase() === String(preferred).toLowerCase());
  return match ?? (requireMatch ? undefined : values[0]);
}

function paramsFor(description: unknown, candidate: ToolCandidate, query: string, ticker?: string): RecordValue | null {
  const schema = findSchema(unwrap(description));
  const properties = schema ? asRecord(schema.properties) : null;
  if (!schema || !properties) return null;
  const required = Array.isArray(schema.required) ? schema.required.filter((item): item is string => typeof item === "string") : [];
  const symbol = ticker ?? /\b[A-Z][A-Z0-9.]{0,5}\b/.exec(query)?.[0];
  const built: RecordValue = {};
  for (const [key, rawProperty] of Object.entries(properties)) {
    const property = asRecord(rawProperty);
    if (!property) continue;
    const field = key.toLowerCase().replace(/[-_]/g, "");
    let value: unknown;
    const identityField = /^(?:ticker|symbol|stock|tickersymbol)$/.test(field);
    if (/^(?:q|query|searchquery|searchterm|keywords|keyword|newsquery|prompt)$/.test(field)) value = query.slice(0, 420);
    else if (identityField && symbol) value = symbol;
    else if (/^(?:period|range|timeperiod)$/.test(field)) value = "1y";
    else if (/^(?:interval|frequency)$/.test(field)) value = "1d";
    else if (/^(?:limit|num|count|maxresults|numresults)$/.test(field)) value = Math.min(20, typeof property.maximum === "number" ? property.maximum : 20);
    else if (/^(?:country|region)$/.test(field)) value = "US";
    else if (/^(?:language|lang)$/.test(field)) value = "en";
    else if (field === "type" && candidate.name.toLowerCase() === "agentkey_search") value = "news";
    else if (required.includes(key)) return null;
    if (value !== undefined) {
      const resolved = enumValue(property, value, identityField);
      if (resolved === undefined) return null;
      built[key] = resolved;
    }
  }
  if (required.some(key => !(key in built))) return null;
  return built;
}

function records(value: unknown, depth = 0): RecordValue[] {
  if (depth > 5) return [];
  const parsed = unwrap(value);
  const object = asRecord(parsed);
  if (!object) {
    if (Array.isArray(parsed)) return parsed.flatMap(item => records(item, depth + 1)).slice(0, 40);
    return [];
  }
  if (typeof object.title === "string" && (typeof object.url === "string" || typeof object.link === "string")) return [object];
  return ["results", "items", "news", "articles", "data", "organic", "sources", "content"].flatMap(key => records(object[key], depth + 1)).slice(0, 40);
}

function parseDate(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const timestamp = Date.parse(String(value));
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function sourceFrom(raw: RecordValue, tool: string): AgentKeySource | null {
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const rawUrl = typeof raw.url === "string" ? raw.url : raw.link;
  if (!title || title.length > 300 || typeof rawUrl !== "string") return null;
  let url: URL;
  try { url = new URL(rawUrl); } catch { return null; }
  if (url.protocol !== "https:" || url.username || url.password || !url.hostname.includes(".")) return null;
  const date = parseDate(raw.publishedAt ?? raw.published_at ?? raw.published_date ?? raw.publication_date ?? raw.published ?? raw.date ?? raw.time);
  const rawPublisher = raw.publisher ?? raw.source;
  const publisher = typeof rawPublisher === "string" && rawPublisher.trim() ? rawPublisher.trim() : url.hostname.replace(/^www\./, "");
  const snippet = typeof raw.snippet === "string" ? raw.snippet : typeof raw.description === "string" ? raw.description : "";
  return { title, url: url.href, publisher: publisher.slice(0, 120), publishedAt: date, snippet: snippet.slice(0, 500), via: "AgentKey", tool };
}

function boundedJson(value: unknown): unknown {
  try {
    const json = JSON.stringify(value);
    if (json.length <= MAX_RESULT_BYTES) return JSON.parse(json) as unknown;
    return { truncated: true, preview: json.slice(0, MAX_RESULT_BYTES - 128) };
  } catch { return null; }
}

export async function gatherAgentKeyResearch(
  query: string,
  client: Pick<AgentKeyClient, "findTools" | "describeTool" | "executeTool"> | null = configuredAgentKey(8_000, 35_000),
  ticker?: string,
): Promise<AgentKeyResearch> {
  const empty = (state: AgentKeyResearch["state"]): AgentKeyResearch => ({ state, query: query.slice(0, MAX_QUERY_LENGTH), tools: [], sources: [], context: "" });
  const normalized = query.trim().replace(/\s+/g, " ");
  if (!client) return empty("unavailable");
  if (!normalized || normalized.length > MAX_QUERY_LENGTH) return empty("unsupported");

  try {
    const discovery = await client.findTools(normalized);
    const candidates = agentKeyResearchCandidates(discovery, normalized);
    const requestedProviders: string[] = [];
    if (/\bgoogle\s+news\b/i.test(normalized)) requestedProviders.push("google-news");
    if (/\byahoo(?:\s+finance)?\b|\byfinance\b/i.test(normalized)) requestedProviders.push("yahoo-finance");
    const selected: ToolCandidate[] = [];
    for (const provider of requestedProviders) {
      const candidate = candidates.find(item => !selected.includes(item) && (provider === "google-news" ? /google.{0,16}news|news.{0,16}google/i.test(`${item.name} ${item.summary}`) : /yahoo|yfinance/i.test(`${item.name} ${item.summary}`)));
      if (!candidate) return empty("unsupported");
      selected.push(candidate);
    }
    if (!requestedProviders.length) selected.push(...candidates.slice(0, MAX_DESCRIBED_CANDIDATES));
    if (!selected.length) return empty("unsupported");

    const prepared: Array<{ candidate: ToolCandidate; cost: number; params: RecordValue }> = [];
    let reservedCredits = 0;
    for (const candidate of selected) {
      if (prepared.length >= MAX_RESULTS) break;
      const description = await client.describeTool(candidate.name);
      const cost = costCredits(description);
      const params = paramsFor(description, candidate, normalized, ticker);
      const usable = !describedAsMutating(description) && cost !== null && cost <= MAX_CREDITS_PER_TOOL && reservedCredits + cost <= MAX_CREDITS_PER_QUERY && params !== null;
      if (!usable) {
        if (requestedProviders.length) return empty("unsupported");
        continue;
      }
      if (cost === null || !params) continue;
      prepared.push({ candidate, cost, params });
      reservedCredits += cost;
    }

    const tools: ToolResult[] = [];
    const sources: AgentKeySource[] = [];
    for (const { candidate, cost, params } of prepared) {
      const result = await client.executeTool(candidate.name, params);
      const data = boundedJson(unwrap(result));
      if (data === null) {
        if (requestedProviders.length) return empty("unsupported");
        continue;
      }
      tools.push({ name: candidate.name, provider: candidate.name.split("/", 1)[0], costCredits: cost, data });
      for (const record of records(result)) {
        const source = sourceFrom(record, candidate.name);
        if (source && !sources.some(item => item.url === source.url)) sources.push(source);
      }
    }
    if (!tools.length) return empty("unsupported");
    const context = tools.map(item => `${item.name} (${item.costCredits} credits): ${JSON.stringify(item.data)}`).join("\n").slice(0, MAX_CONTEXT);
    return { state: "used", query: normalized, tools, sources: sources.slice(0, 40), context };
  } catch (cause) {
    if (!(cause instanceof AgentKeyError)) console.warn("agentkey-research-unavailable", cause instanceof Error ? cause.name : "unknown");
    return empty("unavailable");
  }
}

export function inspectAgentKeyResearchCost(description: unknown) {
  const cost = costCredits(description);
  return { costCredits: cost, withinBudget: cost !== null && cost <= MAX_CREDITS_PER_TOOL };
}
