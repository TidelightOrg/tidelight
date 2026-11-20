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
  reason: "invalid-query" | "no-research-tool" | "requested-provider-missing" | "no-usable-schema" | "no-tool-executed" | null;
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
  if (object.structuredContent !== undefined && object.structuredContent !== null) return unwrap(object.structuredContent, depth + 1);
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

function describedAsMutating(description: unknown): boolean {
  const payload = unwrap(description);
  if (Array.isArray(payload)) return payload.some(block => describedAsMutating(block));
  const writeVerb = /\b(?:writ(?:e|es|ing|ten)|execut(?:e|es|ing|ed)|creat(?:e|es|ing|ed)|updat(?:e|es|ing|ed)|delet(?:e|es|ing|ed)|remov(?:e|es|ing|ed)|publish(?:es|ing|ed)?|submitt?(?:ed|ing|s)?|plac(?:e|es|ing|ed)|send(?:s|ing)?|transferr?(?:ed|ing|s)?|withdraw(?:s|ing)?|deposit(?:s|ing)?|purchas(?:e|es|ing|ed)|modif(?:y|ies|ying|ied)|edit(?:s|ing|ed)?|cancel(?:s|ing|led)?|activat(?:e|es|ing|ed)|deactivat(?:e|es|ing|ed)|enabl(?:e|es|ing|ed)|disabl(?:e|es|ing|ed))\b/i;
  if (typeof payload === "string") return writeVerb.test(payload);
  const descriptor = asRecord(payload);
  if (!descriptor) return false;
  // Check the operation name with the strict action list. Free-text descriptions
  // of market data routinely mention open/close prices and buy/sell ratings.
  const identity = [descriptor.name, descriptor.operation, descriptor.action]
    .filter((value): value is string => typeof value === "string")
    .join(" ").toLowerCase().replace(/[_-]+/g, " ");
  if (MUTATING.test(identity)) return true;
  const prose = [descriptor.summary, descriptor.description]
    .filter((value): value is string => typeof value === "string")
    .join(" ").toLowerCase();
  return writeVerb.test(prose);
}

function providerMatch(candidate: ToolCandidate, query: string) {
  const asksGoogleNews = /\bgoogle\s+news\b/i.test(query);
  const asksYahoo = /\byahoo(?:\s+finance)?\b|\byfinance\b/i.test(query);
  if (asksGoogleNews || asksYahoo) return (asksGoogleNews && isGoogleNews(candidate)) || (asksYahoo && isYahooFinance(candidate));
  return true;
}

function isGoogleNews(candidate: ToolCandidate) {
  const name = candidate.name.toLowerCase();
  return /^serper\/.*news/.test(name) || /^(?:googlenews|google_news)\//.test(name);
}

function isYahooFinance(candidate: ToolCandidate) {
  const name = candidate.name.toLowerCase();
  return /^(?:yfinance|yahoofinance)\//.test(name);
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
  const payload = unwrap(description);
  const advertisedCost = asRecord(asRecord(payload)?.cost);
  // Metered prices are minimums, so they cannot establish the per-call cap.
  if (advertisedCost && (advertisedCost.metered === true || "credits_minimum" in advertisedCost)) return null;
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
  visit(payload);
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
    if (/^(?:params|inputSchema|input_schema|parameters|schema|argsSchema|args_schema|execute_as)$/i.test(key)) {
      const match = findSchema(child, depth + 1);
      if (match) return match;
    }
  }
  return null;
}

function enumValue(property: RecordValue, preferred: unknown) {
  const values = Array.isArray(property.enum) ? property.enum.filter(item => typeof item === "string" || typeof item === "number") : [];
  if (!values.length) return preferred;
  const match = values.find(item => String(item).toLowerCase() === String(preferred).toLowerCase());
  return match;
}

function searchQueryFor(candidate: ToolCandidate, query: string) {
  const bounded = query.slice(0, 420);
  if (!isGoogleNews(candidate)) return bounded;
  const focused = bounded
    .replace(/^\s*(?:please\s+)?use\s+agent\s*key\s+(?:to\s+)?/i, "")
    .replace(/^\s*(?:please\s+)?(?:explain|analyze|summarize|find|search(?:\s+for)?)\s+/i, "")
    .replace(/[.,!?]+$/g, "")
    .replace(/\s+using\s+(?:google\s+news|yahoo\s+finance)(?:\s+(?:and|or)\s+(?:google\s+news|yahoo\s+finance))*\s*$/i, "")
    .replace(/\s+([.,!?])/g, "$1").replace(/[.,!?]+$/g, "")
    .replace(/\s+/g, " ").trim();
  return focused || bounded;
}

function schemaTypes(property: RecordValue): string[] {
  const type = property.type;
  return Array.isArray(type) ? type.filter((item): item is string => typeof item === "string") : typeof type === "string" ? [type] : [];
}

function valueMatchesSchema(property: RecordValue, value: unknown): boolean {
  const types = schemaTypes(property);
  if (types.length) {
    const typeMatches = types.some(type => type === "string" ? typeof value === "string"
      : type === "integer" ? typeof value === "number" && Number.isInteger(value)
        : type === "number" ? typeof value === "number" && Number.isFinite(value)
          : type === "array" ? Array.isArray(value)
            : type === "object" ? asRecord(value) !== null
              : type === "boolean" ? typeof value === "boolean"
                : type === "null" ? value === null : true);
    if (!typeMatches) return false;
  }
  if (typeof value === "string") {
    if (typeof property.minLength === "number" && value.length < property.minLength) return false;
    if (typeof property.maxLength === "number" && value.length > property.maxLength) return false;
    if (typeof property.pattern === "string") {
      try { if (!new RegExp(property.pattern).test(value)) return false; } catch { return false; }
    }
  }
  if (typeof value === "number") {
    if (typeof property.minimum === "number" && value < property.minimum) return false;
    if (typeof property.maximum === "number" && value > property.maximum) return false;
    if (typeof property.exclusiveMinimum === "number" && value <= property.exclusiveMinimum) return false;
    if (typeof property.exclusiveMaximum === "number" && value >= property.exclusiveMaximum) return false;
  }
  if (Array.isArray(value)) {
    if (typeof property.minItems === "number" && value.length < property.minItems) return false;
    if (typeof property.maxItems === "number" && value.length > property.maxItems) return false;
    const itemSchema = asRecord(property.items);
    if (itemSchema && value.some(item => !valueMatchesSchema(itemSchema, item))) return false;
  }
  if (Array.isArray(property.enum) && !property.enum.some(item => JSON.stringify(item) === JSON.stringify(value))) return false;
  return true;
}

function fitGeneratedValue(property: RecordValue, value: unknown): unknown {
  const types = schemaTypes(property);
  if (types.length && !types.some(type => type === "array" ? Array.isArray(value) : type === "string" ? typeof value === "string" : type === "integer" ? typeof value === "number" && Number.isInteger(value) : type === "number" ? typeof value === "number" : type === "object" ? asRecord(value) !== null : type === "boolean" ? typeof value === "boolean" : false)) {
    if (typeof value === "string" && types.includes("array") && asRecord(property.items) && (!schemaTypes(asRecord(property.items)!).length || schemaTypes(asRecord(property.items)!).includes("string"))) value = [value];
    else if (typeof value === "number" && types.includes("string")) value = String(value);
    else if (typeof value === "string" && (types.includes("number") || types.includes("integer")) && /^-?\d+(?:\.\d+)?$/.test(value)) value = Number(value);
    else return undefined;
  }
  return value;
}

function paramsFor(description: unknown, candidate: ToolCandidate, query: string, ticker?: string): RecordValue | null {
  const payload = unwrap(description);
  const descriptor = asRecord(payload);
  // AgentKey documents `params` as the input schema and `execute_as.params` as an example call.
  const schema = descriptor && Object.hasOwn(descriptor, "params") ? asRecord(descriptor.params) : findSchema(payload);
  const properties = schema ? asRecord(schema.properties) : null;
  if (!schema || !properties) return null;
  const required = Array.isArray(schema.required) ? schema.required.filter((item): item is string => typeof item === "string") : [];
  const symbol = ticker;
  const built: RecordValue = {};
  for (const [key, rawProperty] of Object.entries(properties)) {
    const property = asRecord(rawProperty);
    if (!property) continue;
    const field = key.toLowerCase().replace(/[-_]/g, "");
    let value: unknown;
    const identityField = /^(?:ticker|symbol|stock|tickersymbol)$/.test(field);
    if (/^(?:q|query|searchquery|searchterm|keywords|keyword|newsquery|prompt)$/.test(field)) value = searchQueryFor(candidate, query);
    else if (identityField && symbol) value = symbol;
    else if (/^(?:period|range|timeperiod)$/.test(field)) value = "1y";
    else if (/^(?:interval|frequency)$/.test(field)) value = "1d";
    else if (/^(?:limit|num|count|maxresults|numresults)$/.test(field)) value = Math.min(20, typeof property.maximum === "number" ? property.maximum : 20);
    else if (/^(?:country|region)$/.test(field)) value = "US";
    else if (/^(?:language|lang)$/.test(field)) value = "en";
    else if (field === "type" && candidate.name.toLowerCase() === "agentkey_search") value = "news";
    else if (required.includes(key)) return null;
    if (value !== undefined) {
      const fitted = fitGeneratedValue(property, value);
      if (fitted === undefined) return null;
      const resolved = enumValue(property, fitted);
      if (resolved === undefined || !valueMatchesSchema(property, resolved)) return null;
      built[key] = resolved;
    }
  }
  if (required.some(key => !(key in built))) return null;
  return built;
}

function records(value: unknown, depth = 0): RecordValue[] {
  if (depth > 7) return [];
  const parsed = unwrap(value);
  const object = asRecord(parsed);
  if (!object) {
    if (Array.isArray(parsed)) return parsed.flatMap(item => records(item, depth + 1)).slice(0, 40);
    return [];
  }
  const title = [object.title, object.headline].some(value => typeof value === "string");
  const url = [object.url, object.link, object.href, object.canonicalUrl, object.canonical_url].some(value => typeof value === "string");
  if (title && url) return [object];
  return Object.values(object).flatMap(child => records(child, depth + 1)).slice(0, 40);
}

/** Field names only: enough to diagnose an unfamiliar provider wrapper without logging article content. */
function recordShape(value: unknown, depth = 0, prefix = "", into = new Set<string>()): string[] {
  if (depth > 5 || into.size >= 32) return [...into];
  const parsed = unwrap(value);
  if (Array.isArray(parsed)) {
    if (parsed.length) recordShape(parsed[0], depth + 1, `${prefix}[]`, into);
    return [...into];
  }
  const object = asRecord(parsed);
  if (!object) return [...into];
  for (const [key, child] of Object.entries(object)) {
    const safeKey = /^[a-zA-Z][a-zA-Z0-9_-]{0,40}$/.test(key) ? key : "<other>";
    const path = prefix ? `${prefix}.${safeKey}` : safeKey;
    into.add(path);
    if (child && typeof child === "object") recordShape(child, depth + 1, path, into);
    if (into.size >= 32) break;
  }
  return [...into];
}

function parseDate(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const raw = String(value).trim();
  const absolute = Date.parse(raw);
  if (Number.isFinite(absolute)) return new Date(absolute).toISOString();
  // Serper news dates are often relative to retrieval (for example, "3 hours ago").
  // Keep only bounded ages that cannot cross the 30-day issuer evidence window.
  const relative = /^(\d{1,2}|an?)\s+(minute|hour|day|week)s?\s+ago$/i.exec(raw);
  if (!relative) return null;
  const count = /^an?$/i.test(relative[1]) ? 1 : Number(relative[1]);
  const unitMs = { minute: 60_000, hour: 3_600_000, day: 86_400_000, week: 604_800_000 }[relative[2].toLowerCase() as "minute" | "hour" | "day" | "week"];
  const ageMs = count * unitMs;
  if (!count || ageMs > 28 * 86_400_000) return null;
  const timestamp = Date.now() - ageMs;
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function sourceFrom(raw: RecordValue, tool: string): AgentKeySource | null {
  const titleValue = [raw.title, raw.headline].find(value => typeof value === "string");
  const title = typeof titleValue === "string" ? titleValue.trim() : "";
  const rawUrl = [raw.url, raw.link, raw.href, raw.canonicalUrl, raw.canonical_url].find(value => typeof value === "string");
  if (!title || title.length > 300 || typeof rawUrl !== "string") return null;
  let url: URL;
  try { url = new URL(rawUrl); } catch { return null; }
  if (url.protocol !== "https:" || url.username || url.password || !url.hostname.includes(".")) return null;
  const date = parseDate(raw.publishedAt ?? raw.published_at ?? raw.published_date ?? raw.publication_date ?? raw.datePublished ?? raw.publishedTime ?? raw.isoDate ?? raw.pubDate ?? raw.published ?? raw.date ?? raw.time);
  const rawPublisher = raw.publisher ?? raw.source;
  const publisherName = typeof rawPublisher === "string" ? rawPublisher : asRecord(rawPublisher)?.name;
  const publisher = typeof publisherName === "string" && publisherName.trim() ? publisherName.trim() : url.hostname.replace(/^www\./, "");
  const snippetValue = [raw.snippet, raw.description, raw.excerpt, raw.summary].find(value => typeof value === "string");
  const snippet = typeof snippetValue === "string" ? snippetValue : "";
  return { title, url: url.href, publisher: publisher.slice(0, 120), publishedAt: date, snippet: snippet.slice(0, 500), via: "AgentKey", tool };
}

function boundedJson(value: unknown): unknown {
  try {
    const json = JSON.stringify(value);
    if (json.length <= MAX_RESULT_BYTES) return JSON.parse(json) as unknown;
    return { truncated: true, preview: json.slice(0, MAX_RESULT_BYTES - 128) };
  } catch { return null; }
}

function contextForTools(tools: ToolResult[]): string {
  if (!tools.length) return "";
  const perToolBudget = Math.floor(MAX_CONTEXT / tools.length);
  return tools.map(tool => {
    const heading = `${tool.name} (${tool.costCredits} credits): `;
    const payload = JSON.stringify(tool.data);
    return `${heading}${payload.slice(0, Math.max(0, perToolBudget - heading.length))}`;
  }).join("\n").slice(0, MAX_CONTEXT);
}

export async function gatherAgentKeyResearch(
  query: string,
  client: Pick<AgentKeyClient, "findTools" | "describeTool" | "executeTool"> | null = configuredAgentKey(8_000, 35_000),
  ticker?: string,
): Promise<AgentKeyResearch> {
  const empty = (state: AgentKeyResearch["state"], reason: AgentKeyResearch["reason"] = null): AgentKeyResearch => ({ state, reason, query: query.slice(0, MAX_QUERY_LENGTH), tools: [], sources: [], context: "" });
  const normalized = query.trim().replace(/\s+/g, " ");
  if (!client) return empty("unavailable");
  if (!normalized || normalized.length > MAX_QUERY_LENGTH) return empty("unsupported", "invalid-query");
  const activeClient = client;

  try {
    const discovery = await client.findTools(normalized);
    const candidates = agentKeyResearchCandidates(discovery, normalized);
    const requestedProviders: string[] = [];
    if (/\bgoogle\s+news\b/i.test(normalized)) requestedProviders.push("google-news");
    if (/\byahoo(?:\s+finance)?\b|\byfinance\b/i.test(normalized)) requestedProviders.push("yahoo-finance");
    const prepared: Array<{ candidate: ToolCandidate; cost: number; params: RecordValue }> = [];
    let reservedCredits = 0;
    let describedCount = 0;
    async function prepare(candidate: ToolCandidate, provider?: string) {
      if (describedCount >= MAX_DESCRIBED_CANDIDATES) return false;
      describedCount++;
      const description = await activeClient.describeTool(candidate.name);
      const cost = costCredits(description);
      const params = paramsFor(description, candidate, normalized, ticker);
      const rejection = describedAsMutating(description) ? "mutation" : cost === null ? "unknown-cost"
        : cost > MAX_CREDITS_PER_TOOL || reservedCredits + cost > MAX_CREDITS_PER_QUERY ? "over-budget"
          : params === null ? "incompatible-params" : null;
      if (rejection) {
        if (provider) console.warn("agentkey-research-tool-rejected", { provider, tool: candidate.name, reason: rejection });
        return false;
      }
      if (cost === null || !params) return false;
      prepared.push({ candidate, cost, params });
      reservedCredits += cost;
      return true;
    }

    for (const provider of requestedProviders) {
      const matches = (item: ToolCandidate) => provider === "google-news" ? isGoogleNews(item) : isYahooFinance(item);
      const tried = new Set<string>();
      let found = false;
      const options = candidates.filter(matches);
      for (const candidate of options) {
        tried.add(candidate.name);
        if (await prepare(candidate, provider)) { found = true; break; }
      }
      if (!found) {
        const scope = provider === "google-news" ? "search/serper" : "finance/yfinance";
        const intent = provider === "google-news"
          ? `Search Google News about ${ticker ?? "a US listed company"} latest earnings`
          : `Get Yahoo Finance stock price history for ${ticker ?? "a US listed company"} around latest earnings`;
        const scopedDiscovery = await client.findTools(intent, scope);
        for (const candidate of agentKeyResearchCandidates(scopedDiscovery, intent).filter(item => matches(item) && !tried.has(item.name))) {
          tried.add(candidate.name);
          if (await prepare(candidate, provider)) { found = true; break; }
        }
      }
      if (!found) return empty("unsupported", tried.size ? "no-usable-schema" : "requested-provider-missing");
    }
    if (!requestedProviders.length) {
      for (const candidate of candidates.slice(0, MAX_DESCRIBED_CANDIDATES)) {
        if (prepared.length >= MAX_RESULTS) break;
        await prepare(candidate);
      }
    }
    if (!prepared.length) return empty("unsupported", candidates.length ? "no-usable-schema" : "no-research-tool");

    const tools: ToolResult[] = [];
    const sources: AgentKeySource[] = [];
    let sourceRecords = 0;
    let rejectedSourceRecords = 0;
    for (const { candidate, cost, params } of prepared) {
      const result = await client.executeTool(candidate.name, params);
      const data = boundedJson(unwrap(result));
      if (data === null) {
        if (requestedProviders.length) return empty("unsupported", "no-tool-executed");
        continue;
      }
      tools.push({ name: candidate.name, provider: candidate.name.split("/", 1)[0], costCredits: cost, data });
      for (const record of records(result)) {
        sourceRecords++;
        const source = sourceFrom(record, candidate.name);
        if (source && !sources.some(item => item.url === source.url)) sources.push(source);
        else if (!source) rejectedSourceRecords++;
      }
    }
    if (!tools.length) return empty("unsupported", "no-tool-executed");
    if (!sources.length) console.warn("agentkey-research-no-article-links", { tools: tools.map(tool => tool.name), sourceRecords, rejectedSourceRecords, resultShapes: tools.map(tool => ({ name: tool.name, fields: recordShape(tool.data).join(",") })) });
    const context = contextForTools(tools);
    return { state: "used", reason: null, query: normalized, tools, sources: sources.slice(0, 40), context };
  } catch (cause) {
    if (!(cause instanceof AgentKeyError)) console.warn("agentkey-research-unavailable", cause instanceof Error ? cause.name : "unknown");
    return empty("unavailable");
  }
}

export function inspectAgentKeyResearchCost(description: unknown) {
  const cost = costCredits(description);
  return { costCredits: cost, withinBudget: cost !== null && cost <= MAX_CREDITS_PER_TOOL };
}
