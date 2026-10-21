import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "./agent-flow-policy") return nextResolve("./agent-flow-policy.ts", context);
  return nextResolve(specifier, context);
} });
const { buildIssuerNewsQueries, gatherIssuerEvidence } = await import("../lib/agent-flow-sources.ts");
hooks.deregister();

test("research builds eight complementary bounded discovery queries", () => {
  const queries = buildIssuerNewsQueries("NVDA", "NVIDIA");
  assert.equal(queries.length, 4);
  assert.ok(queries.some(query => /earnings|filing/.test(query)));
  assert.ok(queries.some(query => /regulation|lawsuit/.test(query)));
  assert.ok(queries.some(query => /supply chain|industry/.test(query)));
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
    assert.equal(items.length, 3);
    assert.equal(new Set(items.map(item => new URL(item.url).hostname)).size, 2);
    assert.ok(items.every(item => item.publishedAt && item.via === "Public feeds"));
    assert.ok(items.some(item => item.publisher === "Publisher One" || item.publisher === "Publisher Two"));
  } finally { globalThis.fetch = previousFetch; }
});
