import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "./agent-flow-policy") return nextResolve("./agent-flow-policy.ts", context);
  return nextResolve(specifier, context);
} });
const { buildIssuerNewsQueries, gatherIssuerEvidence, issuerEvidenceLookbackDays } = await import("../lib/agent-flow-sources.ts");
hooks.deregister();

test("research builds eight complementary bounded discovery queries", () => {
  const queries = buildIssuerNewsQueries("NVDA", "NVIDIA");
  assert.equal(queries.length, 4);
  assert.ok(queries.some(query => /earnings|filing/.test(query)));
  assert.ok(queries.some(query => /regulation|lawsuit/.test(query)));
  assert.ok(queries.some(query => /supply chain|industry/.test(query)));
});

test("dated fiscal-period questions add period terms and widen the search window without changing current research", () => {
  const question = "Summarize NVIDIA's FY2026 fourth-quarter results using the captured sources.";
  assert.equal(issuerEvidenceLookbackDays(question), 365);
  assert.equal(issuerEvidenceLookbackDays("What changed for NVDA right now?"), 30);
  assert.match(buildIssuerNewsQueries("NVDA", "NVIDIA", question)[0], /2026 fourth-quarter/);
});

test("public feeds retain only relevant, recent dated HTTPS stories and deduplicate coverage", async () => {
  const now = Date.now();
  const requests = [];
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async input => {
    const url = new URL(input);
    requests.push(url);
    const query = url.searchParams.get("q") ?? "";
    const news = query.includes("earnings") || query.includes("filing") ? [
      ["NVIDIA reports quarterly earnings", "https://publisher.example/nvidia-results", "Publisher One"],
      ["NVIDIA quarterly earnings results", "https://other.example/nvidia-results", "Publisher Two"],
      ["NVIDIA supplier expands capacity", "https://third.example/capacity", "Publisher Three"],
      ["NVDA unrelated historical story", "https://old.example/old", "Publisher Four", new Date(now - 31 * 86400000).toISOString()],
    ] : [];
    const xml = news.map(([title, link, publisher, date]) => {
      const pubDate = date ?? new Date(now - 60_000).toUTCString();
      return `<item><title>${title}</title><link>${link}</link><source>${publisher}</source><pubDate>${pubDate}</pubDate><description>Current NVDA coverage</description></item>`;
    }).join("");
    return new Response(`<rss><channel>${xml}</channel></rss>`, { status: 200, headers: { "content-type": "application/rss+xml" } });
  };
  try {
    const items = await gatherIssuerEvidence("NVDA", "NVIDIA");
    assert.equal(requests.length, 8);
    assert.equal(items.length, 2);
    assert.equal(new Set(items.map(item => new URL(item.url).hostname)).size, 2);
    assert.ok(items.every(item => item.publishedAt && item.via === "Public feeds"));
    assert.ok(items.some(item => item.publisher === "Publisher One" || item.publisher === "Publisher Two"));
  } finally { globalThis.fetch = previousFetch; }
});

test("explicit historical issuer questions can retrieve dated event coverage outside the current-news window", async () => {
  const now = Date.now();
  const previousFetch = globalThis.fetch;
  const historicalDate = new Date(now - 120 * 86_400_000).toUTCString();
  globalThis.fetch = async input => {
    const query = new URL(input).searchParams.get("q") ?? "";
    const match = query.includes("earnings") || query.includes("results")
      ? `${query.includes("2026") ? `<item><title>NVIDIA FY2026 fourth-quarter results</title><link>https://issuer.example/fy26-q4</link><source>NVIDIA IR</source><pubDate>${historicalDate}</pubDate><description>Reported quarterly revenue</description></item><item><title>Reuters: NVIDIA reports fourth-quarter revenue</title><link>https://reuters.example/nvidia-q4</link><source>Reuters</source><pubDate>${historicalDate}</pubDate><description>Independent earnings coverage</description></item>` : ""}<item><title>NVIDIA shares rise after product news</title><link>https://recent.example/product-news</link><source>Recent News</source><pubDate>${new Date(now - 60_000).toUTCString()}</pubDate><description>Current company coverage</description></item>`
      : "";
    return new Response(`<rss><channel>${match}</channel></rss>`, { status: 200, headers: { "content-type": "application/rss+xml" } });
  };
  try {
    const question = "Summarize NVIDIA's FY2026 fourth-quarter results.";
    const history = await gatherIssuerEvidence("NVDA", "NVIDIA", question);
    const current = await gatherIssuerEvidence("NVDA", "NVIDIA", "What changed for NVDA right now?");
    assert.equal(history.length, 2);
    assert.deepEqual(new Set(history.map(item => item.url)), new Set(["https://issuer.example/fy26-q4", "https://reuters.example/nvidia-q4"]));
    assert.equal(current.length, 1);
    assert.equal(current[0].url, "https://recent.example/product-news");
  } finally { globalThis.fetch = previousFetch; }
});

test("historical issuer research resolves public-feed canonical links only to the issuer domain and reads a bounded release excerpt", async () => {
  const now = Date.now();
  const previousFetch = globalThis.fetch;
  const historicalDate = new Date(now - 120 * 86_400_000).toUTCString();
  const officialUrl = "https://nvidianews.nvidia.com/news/fy26-q4";
  const html = `<main><h1>NVIDIA FY2026 fourth-quarter results</h1><p>Reported quarterly revenue was $68.1 billion, up 20% from the previous quarter and 73% year over year.</p><p>Management expects next-quarter revenue of $78.0 billion, plus or minus 2%.</p></main>`;
  globalThis.fetch = async input => {
    const url = new URL(input);
    const query = url.searchParams.get("q");
    if (query) {
      const item = query.includes("2026")
        ? `<item><title>NVIDIA FY2026 fourth-quarter results</title><link>https://news.google.com/rss/articles/fy26-q4</link><source>NVIDIA Newsroom</source><pubDate>${historicalDate}</pubDate><description></description></item>`
        : "";
      return new Response(`<rss><channel>${item}</channel></rss>`, { status: 200, headers: { "content-type": "application/rss+xml" } });
    }
    if (url.hostname === "news.google.com") return new Response(`<html><head><link rel="canonical" href="${officialUrl}"></head></html>`, { status: 200, headers: { "content-type": "text/html" } });
    if (url.hostname === "nvidianews.nvidia.com") return new Response(html, { status: 200, headers: { "content-type": "text/html" } });
    throw new Error("Unexpected external host");
  };
  try {
    const items = await gatherIssuerEvidence("NVDA", "NVIDIA", "Summarize NVIDIA's FY2026 fourth-quarter results.");
    assert.equal(items.length, 1);
    assert.equal(items[0].url, officialUrl);
    assert.equal(items[0].via, "Issuer primary source");
    assert.match(items[0].snippet, /\$68\.1 billion/);
    assert.match(items[0].snippet, /\$78\.0 billion/);
  } finally { globalThis.fetch = previousFetch; }
});
