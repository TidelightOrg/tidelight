export type MacroTopic = "monetary_policy" | "inflation" | "labor_market";
export type MacroSourceKind = "official" | "independent_reporting";
export type MacroEvidence = {
  title: string;
  url: string;
  publisher: string;
  publisherDomain: string;
  publishedAt: string | null;
  snippet: string;
  sourceKind: MacroSourceKind;
};

const officialHosts: Record<MacroTopic, string[]> = {
  monetary_policy: ["federalreserve.gov"],
  inflation: ["bls.gov"],
  labor_market: ["bls.gov"],
};
const independentHosts = ["reuters.com", "apnews.com", "cnbc.com", "bloomberg.com", "wsj.com", "nytimes.com", "marketwatch.com"];
const newsHosts = new Set(["news.google.com", "www.bing.com"]);
const months: Record<string, string> = {
  january: "January", jan: "January", february: "February", feb: "February", march: "March", mar: "March",
  april: "April", apr: "April", may: "May", june: "June", jun: "June", july: "July", jul: "July",
  august: "August", aug: "August", september: "September", sep: "September", october: "October", oct: "October",
  november: "November", nov: "November", december: "December", dec: "December",
};
const monthIndex: Record<string, number> = { January: 0, February: 1, March: 2, April: 3, May: 4, June: 5, July: 6, August: 7, September: 8, October: 9, November: 10, December: 11 };

function decode(value: string) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
}
function field(xml: string, tag: string) {
  return decode(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i").exec(xml)?.[1] ?? "");
}
function sourceHost(item: string, link: string) {
  const source = /<source\b[^>]*\burl=["']([^"']+)["'][^>]*>/i.exec(item)?.[1];
  try { return new URL(source ?? link).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; }
}
function isHostOrSubdomain(host: string, domain: string) {
  return host === domain || host.endsWith(`.${domain}`);
}

export function classifyMacroQuestion(question: string): MacroTopic | null {
  if (/\b(?:FOMC|Federal Reserve|fed funds|interest rates?|monetary policy)\b/i.test(question)) return "monetary_policy";
  if (/\b(?:CPI|consumer price index|inflation report)\b/i.test(question)) return "inflation";
  if (/\b(?:employment|payrolls?|jobs report|labor market|labour market|unemployment rate)\b/i.test(question)) return "labor_market";
  return null;
}

function requestedPeriod(question: string) {
  const monthMatch = /\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|october|oct|november|nov|december|dec)\b[ ,]+(?:(\d{1,2})[ ,]+)?(20\d{2})\b/i.exec(question);
  if (!monthMatch) return null;
  return { month: months[monthMatch[1].toLowerCase()], day: monthMatch[2] ? Number(monthMatch[2]) : null, year: monthMatch[3] };
}

export function macroResearchLookbackDays(question: string) {
  return requestedPeriod(question) ? 365 : 30;
}

export function buildMacroNewsQueries(question: string): string[] {
  const topic = classifyMacroQuestion(question);
  if (!topic) return [];
  const period = requestedPeriod(question);
  const context = period ? `${period.month} ${period.day ? `${period.day} ` : ""}${period.year}` : "";
  const source = topic === "monetary_policy" ? "federalreserve.gov" : "bls.gov";
  const terms = topic === "monetary_policy" ? "FOMC policy statement federal funds rate" : topic === "inflation" ? "CPI consumer price index inflation" : "employment situation nonfarm payrolls unemployment";
  return [
    `site:${source} ${context} ${terms}`.trim(),
    `${context} ${terms} (Reuters OR AP OR CNBC OR Bloomberg)`.trim(),
  ];
}

function matchesPeriod(item: MacroEvidence, question: string, now: number) {
  const period = requestedPeriod(question);
  if (!item.publishedAt) return false;
  const published = Date.parse(item.publishedAt);
  if (!Number.isFinite(published) || published > now + 5 * 60_000 || now - published > macroResearchLookbackDays(question) * 86_400_000) return false;
  if (!period) return true;
  const content = `${item.title} ${item.snippet}`.toLowerCase();
  const monthMatches = content.includes(period.month.toLowerCase());
  const yearMatches = content.includes(period.year);
  if (monthMatches && yearMatches) return true;
  const pubDate = new Date(published);
  if (period.day && pubDate.getUTCFullYear() === Number(period.year) && pubDate.getUTCMonth() === monthIndex[period.month] && pubDate.getUTCDate() === period.day) return true;
  // Allow a named release month and its publication in the following month (e.g. August CPI released in September).
  const targetMonth = new Date(Date.UTC(Number(period.year), monthIndex[period.month], 1));
  const targetIndex = Number(period.year) * 12 + targetMonth.getUTCMonth();
  const publishedIndex = pubDate.getUTCFullYear() * 12 + pubDate.getUTCMonth();
  const lag = publishedIndex - targetIndex;
  return lag >= 0 && lag <= 1 && monthMatches;
}

async function readBoundedText(response: Response, maxBytes: number) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        return "";
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(body);
}

async function readFeed(url: URL): Promise<Array<{ item: string; title: string; link: string; publisher: string; host: string; publishedAt: string | null; snippet: string }>> {
  let current = url;
  let response: Response | null = null;
  for (let hop = 0; hop < 3; hop++) {
    response = await fetch(current, { headers: { Accept: "application/rss+xml, application/xml, text/xml", "User-Agent": "Tidelight Research/1.0" }, signal: AbortSignal.timeout(10_000), cache: "no-store", redirect: "manual" });
    if (response.status < 300 || response.status >= 400) break;
    const location = response.headers.get("location");
    if (!location) return [];
    const next = new URL(location, current);
    // Keep the feed fetch on its original trusted search provider and bound redirect hops.
    if (next.protocol !== "https:" || next.hostname !== url.hostname) return [];
    current = next;
  }
  if (!response) return [];
  if (!response.ok) throw new Error(`http-${response.status}`);
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > 2_000_000) return [];
  const xml = await readBoundedText(response, 2_000_000);
  if (!xml) return [];
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 30).flatMap(match => {
    const item = match[1], title = field(item, "title"), link = field(item, "link");
    if (!title || !link.startsWith("https://")) return [];
    const published = Date.parse(field(item, "pubDate"));
    return [{ item, title, link, publisher: field(item, "source") || "Unknown publisher", host: sourceHost(item, link),
      publishedAt: Number.isFinite(published) ? new Date(published).toISOString() : null, snippet: field(item, "description").slice(0, 800) }];
  });
}

/** Bounded public-feed discovery for macro questions; only official Fed/BLS and named publishers are admitted. */
export async function gatherMacroEvidence(question: string): Promise<MacroEvidence[]> {
  const topic = classifyMacroQuestion(question);
  if (!topic) return [];
  const urls = buildMacroNewsQueries(question).flatMap(query => {
    const google = new URL("https://news.google.com/rss/search");
    google.search = new URLSearchParams({ q: query, hl: "en-US", gl: "US", ceid: "US:en" }).toString();
    const bing = new URL("https://www.bing.com/news/search");
    bing.search = new URLSearchParams({ q: query, format: "rss" }).toString();
    return [google, bing];
  });
  const results = await Promise.allSettled(urls.map(readFeed));
  const now = Date.now(), official = officialHosts[topic];
  const stories = new Map<string, MacroEvidence>();
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    for (const row of result.value) {
      const officialSource = official.some(host => isHostOrSubdomain(row.host, host));
      const independentSource = independentHosts.some(host => isHostOrSubdomain(row.host, host));
      if (!officialSource && !independentSource) continue;
      const via = officialSource ? "official" : "independent_reporting";
      const evidence: MacroEvidence = { title: row.title, url: row.link, publisher: row.publisher, publisherDomain: row.host, publishedAt: row.publishedAt, snippet: row.snippet, sourceKind: via };
      if (!matchesPeriod(evidence, question, now)) continue;
      const url = new URL(row.link);
      if (!newsHosts.has(url.hostname) && !official.some(host => isHostOrSubdomain(url.hostname, host)) && !independentHosts.some(host => isHostOrSubdomain(url.hostname, host))) continue;
      const key = `${row.host}:${row.title.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
      const previous = stories.get(key);
      if (!previous || evidence.snippet.length > previous.snippet.length) stories.set(key, evidence);
    }
  }
  return [...stories.values()].sort((a, b) => {
    if (a.sourceKind !== b.sourceKind) return a.sourceKind === "official" ? -1 : 1;
    return Date.parse(b.publishedAt ?? "") - Date.parse(a.publishedAt ?? "");
  }).slice(0, 20);
}
