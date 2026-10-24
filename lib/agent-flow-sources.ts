import type { FlowSource } from "./agent-flow-policy";

export type FlowEvidence = FlowSource & { snippet: string };
const issuerNames: Record<string, string> = { NVDA: "NVIDIA", TSLA: "Tesla", AAPL: "Apple", AMD: "Advanced Micro Devices", MSFT: "Microsoft", META: "Meta", AMZN: "Amazon", GOOGL: "Alphabet", INTC: "Intel", ASML: "ASML", QCOM: "Qualcomm", MU: "Micron" };

function decode(value: string) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
}

function field(xml: string, tag: string) {
  return decode(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i").exec(xml)?.[1] ?? "");
}

async function readTextBounded(response: Response, maxBytes: number) {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) { await reader.cancel(); return null; }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(bytes);
}

async function rss(url: URL): Promise<FlowEvidence[]> {
  const response = await fetch(url, { headers: { Accept: "application/rss+xml, application/xml, text/xml", "User-Agent": "Tidelight Research/1.0" }, signal: AbortSignal.timeout(12_000), cache: "no-store" });
  if (!response.ok) throw new Error(`http-${response.status}`);
  const xml = await readTextBounded(response, 750_000);
  if (!xml) throw new Error("feed-too-large");
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 30).flatMap(match => {
    const item = match[1], title = field(item, "title"), link = field(item, "link");
    if (!title || !link.startsWith("https://")) return [];
    const published = Date.parse(field(item, "pubDate"));
    return [{ title, url: link, publisher: field(item, "source") || new URL(link).hostname.replace(/^www\./, ""),
      publishedAt: Number.isFinite(published) ? new Date(published).toISOString() : null,
      snippet: field(item, "description").slice(0, 500), via: "Public feeds" as const }];
  });
}

const MAX_EVIDENCE_AGE_MS = 30 * 86_400_000;
const HISTORICAL_EVIDENCE_AGE_MS = 365 * 86_400_000;
const MAX_DISCOVERY_ITEMS = 40;

function historicalSearchContext(question: string) {
  const years = [...question.matchAll(/\b(?:FY\s*|fiscal\s+)?(20\d{2})\b/gi)].map(match => match[1]);
  const periods = [...question.matchAll(/\b(?:Q[1-4]|first|second|third|fourth)\s*[- ]?quarter\b/gi)].map(match => match[0]);
  const dated = /\b(?:19|20)\d{2}-\d{2}-\d{2}\b|\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2},?\s+(?:19|20)\d{2}\b/i.test(question);
  const hasHistoricalPeriod = years.length > 0 && (periods.length > 0 || /\b(?:results?|earnings|release|outlook|capital[- ]spending|guidance)\b/i.test(question));
  const terms = [...new Set([...years, ...periods].map(term => term.toLowerCase().replace(/\s+/g, " ")))];
  const quarter = periods[0]?.match(/q([1-4])|first|second|third|fourth/i)?.[0]?.toLowerCase() ?? null;
  const quarterNumber = quarter ? ({ first: "1", second: "2", third: "3", fourth: "4", q1: "1", q2: "2", q3: "3", q4: "4" } as Record<string, string>)[quarter] : null;
  return { historical: dated || hasHistoricalPeriod, terms, year: years[0] ?? null, quarterNumber };
}

function matchesRequestedPeriod(item: FlowEvidence, context: ReturnType<typeof historicalSearchContext>) {
  if (!context.historical || !context.year) return true;
  const text = `${item.title} ${item.snippet}`.toLowerCase();
  if (!text.includes(context.year)) return false;
  if (!context.quarterNumber) return true;
  const quarterForms = [new RegExp(`\\bq${context.quarterNumber}\\b`, "i")];
  const match = text.match(/\b(first|second|third|fourth)[ -]+(?:fiscal[ -]+)?quarter\b/i)?.[1]?.toLowerCase();
  const ordinalNumber = match ? ({ first: "1", second: "2", third: "3", fourth: "4" } as Record<string, string>)[match] : null;
  return quarterForms[0].test(text) || ordinalNumber === context.quarterNumber;
}

function storyKey(item: FlowEvidence) {
  const normalized = item.title.toLowerCase().replace(/\s+-\s+[^-]+$/, "").replace(/[^a-z0-9]/g, "");
  return normalized.replace(/quarterly|reports|results|reporting|announces|announced/g, "");
}

function withinResearchWindow(item: FlowEvidence, now: number, maxAgeMs = MAX_EVIDENCE_AGE_MS) {
  if (!item.publishedAt) return false;
  const published = Date.parse(item.publishedAt);
  return Number.isFinite(published) && published <= now + 5 * 60_000 && now - published <= maxAgeMs;
}

const primaryIssuerHosts: Record<string, string[]> = {
  NVDA: ["nvidianews.nvidia.com", "investor.nvidia.com"], TSLA: ["ir.tesla.com"], AAPL: ["investor.apple.com"],
  AMD: ["ir.amd.com"], MSFT: ["microsoft.com", "news.microsoft.com"], META: ["investor.fb.com", "about.fb.com"],
  AMZN: ["ir.aboutamazon.com", "aboutamazon.com"], GOOGL: ["abc.xyz", "blog.google"], INTC: ["newsroom.intel.com", "intel.com"],
  ASML: ["asml.com"], QCOM: ["investor.qualcomm.com", "qualcomm.com"], MU: ["investors.micron.com", "micron.com"],
};
const newsRedirectHosts = new Set(["news.google.com", "www.bing.com"]);

function isHostOrSubdomain(host: string, domain: string) {
  return host === domain || host.endsWith(`.${domain}`);
}

function readableArticleText(html: string) {
  const main = /<(?:main|article)\b[^>]*>([\s\S]*?)<\/(?:main|article)>/i.exec(html)?.[1] ?? html;
  const blocks = [...main.matchAll(/<(?:p|h[1-6]|li|tr)\b[^>]*>([\s\S]*?)<\/(?:p|h[1-6]|li|tr)>/gi)]
    .map(match => decode(match[1]).replace(/\s+/g, " ").trim())
    .filter(text => text.length > 35);
  if (blocks.length) return [...new Set(blocks)].join(" ").slice(0, 3_500);
  const description = /<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)["']/i.exec(html)?.[1] ?? "";
  return decode(description).slice(0, 3_500);
}

function officialUrlFromRedirectPage(html: string, allowedHosts: string[]) {
  const normalized = html.replace(/\\\//g, "/").replace(/\\u0026/gi, "&").replace(/&amp;/gi, "&");
  const urls = normalized.match(/https:\/\/[^\s"'<>\\]+/gi) ?? [];
  for (const raw of urls) {
    try {
      const candidate = new URL(raw.replace(/[),.;]+$/, ""));
      if (allowedHosts.some(host => isHostOrSubdomain(candidate.hostname, host))) return candidate;
    } catch { /* Ignore malformed URLs embedded in a search redirect page. */ }
  }
  return null;
}

async function readPrimaryIssuerArticle(ticker: string, item: FlowEvidence): Promise<FlowEvidence> {
  const allowedHosts = primaryIssuerHosts[ticker] ?? [];
  let current: URL;
  try { current = new URL(item.url); } catch { return item; }
  if (current.protocol !== "https:" || (!newsRedirectHosts.has(current.hostname) && !allowedHosts.some(host => isHostOrSubdomain(current.hostname, host)))) return item;
  try {
    for (let hop = 0; hop < 4; hop++) {
      const response = await fetch(current, { headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": "Tidelight Research/1.0" }, signal: AbortSignal.timeout(8_000), cache: "no-store", redirect: "manual" });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) return item;
        const next = new URL(location, current);
        if (next.protocol !== "https:" || (!newsRedirectHosts.has(next.hostname) && !allowedHosts.some(host => isHostOrSubdomain(next.hostname, host)))) return item;
        current = next;
        continue;
      }
      const html = await readTextBounded(response, 2_000_000);
      if (!html) return item;
      if (!response.ok) return item;
      if (!allowedHosts.some(host => isHostOrSubdomain(current.hostname, host))) {
        if (!newsRedirectHosts.has(current.hostname)) return item;
        const official = officialUrlFromRedirectPage(html, allowedHosts);
        if (!official) return item;
        current = official;
        continue;
      }
      const snippet = readableArticleText(html);
      return snippet.length >= 120 ? { ...item, url: current.toString(), snippet, via: "Issuer primary source" } : item;
    }
  } catch { /* Keep the dated headline when an issuer site is unavailable. */ }
  return item;
}

/** Bounded multi-query public headline discovery. Search results are pointers, not verified article contents. */
export function buildIssuerNewsQueries(ticker: string, issuer: string, question = ""): string[] {
  const name = issuerNames[ticker] ?? issuer;
  const context = historicalSearchContext(question);
  const historicalTerm = context.terms.length ? ` (${context.terms.join(" ")})` : "";
  return [
    context.historical
      ? `"${name}" OR "${ticker}" ${context.terms.join(" ")} (earnings OR filing OR results)`
      : `"${name}" OR "${ticker}"${historicalTerm} (earnings OR filing OR results)`,
    `"${name}" OR "${ticker}" (guidance OR revenue OR product)`,
    `"${name}" OR "${ticker}" (regulation OR lawsuit OR analyst)`,
    `"${name}" OR "${ticker}" (industry OR supply chain OR market)`,
  ];
}
export async function gatherIssuerEvidence(ticker: string, issuer: string, question = ""): Promise<FlowEvidence[]> {
  const name = issuerNames[ticker] ?? issuer;
  const context = historicalSearchContext(question);
  const queries = buildIssuerNewsQueries(ticker, issuer, question);
  const urls = queries.flatMap(query => {
    const google = new URL("https://news.google.com/rss/search");
    google.search = new URLSearchParams({ q: query, hl: "en-US", gl: "US", ceid: "US:en" }).toString();
    const bing = new URL("https://www.bing.com/news/search");
    bing.search = new URLSearchParams({ q: query, format: "rss" }).toString();
    return [google, bing];
  });
  const results = await Promise.allSettled(urls.map(rss));
  results.forEach((result, index) => {
    if (result.status === "rejected") console.warn("agent-flow-source-feed", ticker, index % 2 ? "bing" : "google", result.reason instanceof Error ? result.reason.message : "unavailable");
  });
  const now = Date.now();
  const stories = new Map<string, FlowEvidence>();
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    for (const item of result.value) {
      const headline = `${item.title} ${item.snippet}`;
      const relevant = new RegExp(`(^|[^a-z0-9])${ticker}([^a-z0-9]|$)`, "i").test(headline) ||
        (name.length >= 4 && headline.toLowerCase().includes(name.toLowerCase()));
      const maxAge = context.historical ? HISTORICAL_EVIDENCE_AGE_MS : MAX_EVIDENCE_AGE_MS;
      if (!relevant || !withinResearchWindow(item, now, maxAge) || !matchesRequestedPeriod(item, context)) continue;
      const key = storyKey(item);
      const previous = stories.get(key);
      if (!previous || (item.snippet.length > previous.snippet.length && item.via === "Public feeds")) stories.set(key, item);
    }
  }
  if (!stories.size && results.some(result => result.status === "fulfilled")) console.warn("agent-flow-source-empty", ticker, results.map(result => result.status === "fulfilled" ? result.value.length : "failed"));
  const ranked = [...stories.values()]
    .sort((a, b) => {
      if (context.historical && context.year) {
        const aMatches = matchesRequestedPeriod(a, context), bMatches = matchesRequestedPeriod(b, context);
        if (aMatches !== bMatches) return aMatches ? -1 : 1;
      }
      return Date.parse(b.publishedAt ?? "") - Date.parse(a.publishedAt ?? "");
    })
    .slice(0, MAX_DISCOVERY_ITEMS);
  const primaryCandidates = ranked.filter(item => primaryIssuerHosts[ticker]?.some(host => item.publisher.toLowerCase().includes(host.split(".")[0])) || item.publisher.toLowerCase().includes(name.toLowerCase())).slice(0, 6);
  const enriched = await Promise.all(primaryCandidates.map(item => readPrimaryIssuerArticle(ticker, item)));
  const enrichedByUrl = new Map(primaryCandidates.map((item, index) => [item.url, enriched[index]]));
  return ranked.map(item => enrichedByUrl.get(item.url) ?? item);
}

export function issuerEvidenceLookbackDays(question: string) {
  return historicalSearchContext(question).historical ? 365 : 30;
}
