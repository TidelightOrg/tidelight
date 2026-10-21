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

async function rss(url: URL): Promise<FlowEvidence[]> {
  const response = await fetch(url, { headers: { Accept: "application/rss+xml, application/xml, text/xml", "User-Agent": "Tidelight Research/1.0" }, signal: AbortSignal.timeout(12_000), cache: "no-store" });
  if (!response.ok) throw new Error(`http-${response.status}`);
  const xml = await response.text();
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
const MAX_DISCOVERY_ITEMS = 40;

function storyKey(item: FlowEvidence) {
  return item.title.toLowerCase().replace(/\s+-\s+[^-]+$/, "").replace(/[^a-z0-9]/g, "").replace(/quarterly|reports|results|reporting|announces|announced/g, "");
}

function withinResearchWindow(item: FlowEvidence, now: number) {
  if (!item.publishedAt) return false;
  const published = Date.parse(item.publishedAt);
  return Number.isFinite(published) && published <= now + 5 * 60_000 && now - published <= MAX_EVIDENCE_AGE_MS;
}

/** Bounded multi-query public headline discovery. Search results are pointers, not verified article contents. */
export function buildIssuerNewsQueries(ticker: string, issuer: string): string[] {
  const name = issuerNames[ticker] ?? issuer;
  return [
    `"${name}" OR "${ticker}" (stock OR earnings OR filing)`,
    `"${name}" OR "${ticker}" (guidance OR revenue OR product)`,
    `"${name}" OR "${ticker}" (regulation OR lawsuit OR analyst)`,
    `"${name}" OR "${ticker}" (industry OR supply chain OR market)`,
  ];
}
export async function gatherIssuerEvidence(ticker: string, issuer: string): Promise<FlowEvidence[]> {
  const name = issuerNames[ticker] ?? issuer;
  const queries = buildIssuerNewsQueries(ticker, issuer);
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
      if (!relevant || !withinResearchWindow(item, now)) continue;
      const key = storyKey(item);
      const previous = stories.get(key);
      if (!previous || (item.snippet.length > previous.snippet.length && item.via === "Public feeds")) stories.set(key, item);
    }
  }
  if (!stories.size && results.some(result => result.status === "fulfilled")) console.warn("agent-flow-source-empty", ticker, results.map(result => result.status === "fulfilled" ? result.value.length : "failed"));
  return [...stories.values()]
    .sort((a, b) => Date.parse(b.publishedAt ?? "") - Date.parse(a.publishedAt ?? ""))
    .slice(0, MAX_DISCOVERY_ITEMS);
}
