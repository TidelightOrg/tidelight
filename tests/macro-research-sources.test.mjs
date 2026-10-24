import test from "node:test";
import assert from "node:assert/strict";
import { buildMacroNewsQueries, classifyMacroQuestion, gatherMacroEvidence } from "../lib/macro-research-sources.ts";

function item({ title, link, source, date, snippet }) {
  return `<item><title>${title}</title><link>${link}</link><source url="https://${source}">${source.split(".")[0]}</source><pubDate>${date}</pubDate><description>${snippet ?? "Captured public release context."}</description></item>`;
}

test("macro question classification accepts only bounded FOMC, CPI, and labor topics", () => {
  assert.equal(classifyMacroQuestion("Explain the September 16, 2026 FOMC decision."), "monetary_policy");
  assert.equal(classifyMacroQuestion("Summarize August 2026 U.S. CPI."), "inflation");
  assert.equal(classifyMacroQuestion("Summarize September 2026 employment and payroll revisions."), "labor_market");
  assert.equal(classifyMacroQuestion("Summarize the September 2026 U.S. employment release."), "labor_market");
  assert.equal(classifyMacroQuestion("What is the outlook for NVDA?"), null);
  assert.deepEqual(buildMacroNewsQueries("What is BTC doing?"), []);
});

test("undated macro questions use a 30-day window and drop stale feed entries", async () => {
  const previousFetch = globalThis.fetch;
  const stale = new Date(Date.now() - 31 * 86_400_000).toUTCString();
  globalThis.fetch = async () => new Response(`<rss><channel>${item({ title: "BLS CPI update", link: "https://news.google.com/rss/articles/stale", source: "bls.gov", date: stale })}</channel></rss>`, { status: 200, headers: { "content-type": "application/rss+xml" } });
  try {
    const evidence = await gatherMacroEvidence("Summarize the latest U.S. CPI release.");
    assert.deepEqual(evidence, []);
  } finally { globalThis.fetch = previousFetch; }
});

test("queries include the requested event period and official source domains", () => {
  const fed = buildMacroNewsQueries("Explain the September 16, 2026 FOMC decision and rationale.");
  assert.match(fed[0], /site:federalreserve\.gov September 16 2026/);
  assert.match(fed[1], /September 16 2026/);
  const cpi = buildMacroNewsQueries("Summarize the August 2026 U.S. CPI release.");
  assert.match(cpi[0], /site:bls\.gov August 2026/);
});

test("gathering macro evidence keeps matching official and independent sources and excludes unrelated dates/domains", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async input => {
    const url = new URL(input);
    const query = url.searchParams.get("q") ?? "";
    const rows = query.includes("federalreserve.gov") ? [
      item({ title: "Federal Reserve issues FOMC statement for September 2026", link: "https://news.google.com/rss/articles/fomc-sep26", source: "federalreserve.gov", date: "Wed, 16 Sep 2026 14:00:00 GMT", snippet: "The Committee decided to maintain the target range." }),
      item({ title: "Federal Reserve issues FOMC statement for July 2026", link: "https://news.google.com/rss/articles/fomc-jul26", source: "federalreserve.gov", date: "Wed, 29 Jul 2026 14:00:00 GMT" }),
      item({ title: "Unverified Fed rumor for September 2026", link: "https://news.google.com/rss/articles/rumor", source: "unknown.example", date: "Wed, 16 Sep 2026 14:00:00 GMT" }),
    ] : [
      item({ title: "Fed holds rates in September 2026, Reuters reports", link: "https://news.google.com/rss/articles/reuters-fomc", source: "www.reuters.com", date: "Wed, 16 Sep 2026 14:30:00 GMT" }),
    ];
    return new Response(`<rss><channel>${rows.join("")}</channel></rss>`, { status: 200, headers: { "content-type": "application/rss+xml" } });
  };
  try {
    const evidence = await gatherMacroEvidence("Explain the September 16, 2026 FOMC decision and rationale.");
    assert.equal(evidence.length, 2);
    assert.equal(evidence[0].sourceKind, "official");
    assert.equal(evidence[0].publishedAt, "2026-09-16T14:00:00.000Z");
    assert.equal(evidence[1].sourceKind, "independent_reporting");
    assert.ok(evidence.every(source => source.url.startsWith("https://news.google.com/")));
    assert.ok(evidence.every(source => !source.title.includes("July")));
  } finally { globalThis.fetch = previousFetch; }
});

test("release-month matching admits the following-month publication window", async () => {
  const previousFetch = globalThis.fetch;
  const releaseDate = new Date("2026-09-11T12:30:00Z").toUTCString();
  globalThis.fetch = async () => new Response(`<rss><channel>${item({ title: "Consumer Price Index rises in August", link: "https://news.google.com/rss/articles/cpi-aug", source: "bls.gov", date: releaseDate })}</channel></rss>`, { status: 200, headers: { "content-type": "application/rss+xml" } });
  try {
    const evidence = await gatherMacroEvidence("Summarize the August 2026 U.S. CPI release.");
    assert.equal(evidence.length, 1);
    assert.equal(evidence[0].publisherDomain, "bls.gov");
  } finally { globalThis.fetch = previousFetch; }
});

test("macro feed redirects cannot escape the configured search host", async () => {
  const previousFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => {
    requests++;
    return new Response(null, { status: 302, headers: { location: "https://attacker.example/feed" } });
  };
  try {
    const evidence = await gatherMacroEvidence("Summarize August 2026 U.S. CPI release.");
    assert.deepEqual(evidence, []);
    assert.equal(requests, 4);
  } finally { globalThis.fetch = previousFetch; }
});

test("macro feed response bodies are bounded even without a Content-Length header", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("x".repeat(2_000_100), { status: 200, headers: { "content-type": "application/rss+xml" } });
  try {
    const evidence = await gatherMacroEvidence("Summarize the latest U.S. CPI release.");
    assert.deepEqual(evidence, []);
  } finally { globalThis.fetch = previousFetch; }
});
