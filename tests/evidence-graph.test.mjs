import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "@/lib/agent-flow-policy") return { url: new URL("../lib/agent-flow-policy.ts", import.meta.url).href, shortCircuit: true };
  return nextResolve(specifier, context);
} });
const { buildEvidenceGraph } = await import("../lib/evidence-graph.ts");
hooks.deregister();

const asOf = "2026-10-31T20:00:00.000Z";
const sources = [
  { title: "Official filing", url: "https://sec.gov/filing/1", publisher: "SEC", publishedAt: "2026-10-30T10:00:00.000Z", snippet: "Reported revenue rose 8%." },
  { title: "Undated overview", url: "https://publisher.example/overview", publisher: "Publisher", publishedAt: null, snippet: "An undated excerpt." },
  { title: "Future update", url: "https://publisher.example/future", publisher: "Publisher", publishedAt: "2026-11-02T10:00:00.000Z", snippet: "This was not yet available at the snapshot." },
];
const asset = {
  ticker: "NVDA", issuer: "NVIDIA", summary: "The supplied sources indicate stronger revenue, while the market response remains uncertain.", stance: "mixed", confidence: 0.64,
  sources, evidenceBalance: {
    supporting: [{ text: "Reported revenue rose 8%.", citedUrls: [sources[0].url, sources[2].url] }],
    counter: [{ text: "The undated source leaves timing unclear.", citedUrls: [sources[1].url] }],
  }, risks: ["Overnight gap risk."], nextCheck: "Review the next filing.",
  market: { spotSymbol: "RNVDAUSDT", spotLastPrice: 150, spotProviderTimestamp: Date.parse(asOf) - 30_000, perpSymbol: "NVDAUSDT", perpLastPrice: 151, perpProviderTimestamp: Date.parse(asOf) - 30_000 },
};

test("graph links event, issuer, hypotheses, claims, passages and distinct instruments", () => {
  const graph = buildEvidenceGraph({ question: "Review NVDA evidence", assets: [asset], asOf, synthesisMode: "model" });
  const byId = new Map(graph.nodes.map(node => [node.id, node]));
  const claim = graph.nodes.find(node => node.type === "claim" && node.polarity === "supporting");
  assert.ok(claim);
  assert.equal(claim.citationStatus, "source_linked");
  assert.equal(claim.sourceIds.length, 1, "a post-snapshot citation cannot support a historical snapshot");
  assert.equal(graph.nodes.some(node => node.type === "source" && node.url === sources[2].url), false, "future source text and metadata are omitted from the historical graph");
  const cited = graph.edges.find(edge => edge.from === claim.id && edge.relation === "cites");
  assert.equal(byId.get(cited.to).type, "passage");
  assert.equal(byId.get(cited.to).exactQuoteVerified, false);
  assert.deepEqual(new Set(graph.nodes.filter(node => node.type === "instrument").map(node => node.marketType)), new Set(["reality_tokenized_spot", "us_stock_perpetual"]));
  assert.equal(graph.nodes.find(node => node.type === "instrument" && node.symbol === "RNVDAUSDT").lastPrice, 150);
  assert.ok(graph.edges.some(edge => edge.relation === "supports"));
  assert.ok(graph.edges.some(edge => edge.relation === "challenges"));
  assert.equal(graph.nodes.find(node => node.type === "hypothesis").confidenceOrigin, "model_reported");
});

test("stable graph IDs reproduce and source-only fallback confidence is not attributed to a model", () => {
  const first = buildEvidenceGraph({ question: "Review NVDA evidence", assets: [asset], asOf, synthesisMode: "source_only" });
  const second = buildEvidenceGraph({ question: "Review NVDA evidence", assets: [asset], asOf, synthesisMode: "source_only" });
  assert.deepEqual(first, second);
  const hypothesis = first.nodes.find(node => node.type === "hypothesis");
  assert.equal(hypothesis.reportedConfidence, null);
  assert.equal(hypothesis.confidenceOrigin, "application_fallback");
});

test("macro subjects are not mislabeled as issuers and invalid snapshot times fail", () => {
  const graph = buildEvidenceGraph({ question: "Explain the CPI release", asOf, synthesisMode: "source_only", assets: [{ ticker: "MACRO", issuer: "U.S. inflation", summary: "No conclusion established.", stance: "unclear", confidence: 0, sources: [] }] });
  assert.equal(graph.nodes.find(node => node.type === "subject").subjectType, "macro_topic");
  assert.throws(() => buildEvidenceGraph({ question: "x", assets: [], asOf: "invalid", synthesisMode: "model" }), /invalid-asof/);
});

test("future market timestamps cannot leak their prices into an as-of graph", () => {
  const graph = buildEvidenceGraph({ question: "Review NVDA", asOf, synthesisMode: "model", assets: [{ ...asset, market: { spotSymbol: "RNVDAUSDT", spotLastPrice: 999, spotProviderTimestamp: Date.parse(asOf) + 1 } }] });
  const instrument = graph.nodes.find(node => node.type === "instrument");
  assert.equal(instrument.availability, "unavailable");
  assert.equal(instrument.observedAt, null);
  assert.equal(instrument.lastPrice, null);
});

test("prioritizes sources cited by claims within the graph bound", () => {
  const longSources = Array.from({ length: 35 }, (_, index) => ({ title: `Source ${index}`, url: `https://publisher.example/${index}`, publisher: "Publisher", publishedAt: "2026-10-30T10:00:00Z", snippet: `Excerpt ${index}` }));
  const graph = buildEvidenceGraph({ question: "Review NVDA", asOf, synthesisMode: "model", assets: [{ ...asset, sources: longSources, evidenceBalance: { supporting: [{ text: "Supported", citedUrls: [longSources[34].url] }], counter: [] } }] });
  const claim = graph.nodes.find(node => node.type === "claim");
  assert.equal(claim.citationStatus, "source_linked");
  assert.equal(graph.nodes.some(node => node.type === "source" && node.url === longSources[34].url), true);
  assert.equal(graph.nodes.filter(node => node.type === "source").length, 30);
});

test("per-asset synthesis attribution keeps source-only fallback confidence unattributed", () => {
  const graph = buildEvidenceGraph({ question: "Review multiple issuers", asOf, synthesisMode: "model", assets: [{ ...asset, ticker: "NVDA", synthesisMode: "model" }, { ...asset, ticker: "TSLA", synthesisMode: "source_only", confidence: 0.7 }] });
  const fallback = graph.nodes.find(node => node.type === "hypothesis" && node.ticker === "TSLA");
  assert.equal(fallback.reportedConfidence, null);
  assert.equal(fallback.confidenceOrigin, "application_fallback");
});

test("confidence capped by source policy is labeled application-calibrated", () => {
  const graph = buildEvidenceGraph({ question: "Review NVDA", asOf, synthesisMode: "model", assets: [{ ...asset, confidence: 0.4, confidenceCapped: true }] });
  const hypothesis = graph.nodes.find(node => node.type === "hypothesis");
  assert.equal(hypothesis.reportedConfidence, 0.4);
  assert.equal(hypothesis.confidenceOrigin, "application_calibrated");
});

test("duplicate claim text merges citations so graph edges and source ids agree", () => {
  const graph = buildEvidenceGraph({ question: "Review NVDA", asOf, synthesisMode: "model", assets: [{ ...asset, evidenceBalance: { supporting: [{ text: "Same fact", citedUrls: [sources[0].url] }, { text: "Same fact", citedUrls: [sources[1].url] }], counter: [] } }] });
  const claim = graph.nodes.find(node => node.type === "claim");
  const targetIds = graph.edges.filter(edge => edge.from === claim.id && edge.relation === "cites").map(edge => edge.to);
  const sourceIds = graph.edges.filter(edge => edge.from === claim.id && edge.relation === "cites").map(edge => { const target = graph.nodes.find(node => node.id === edge.to); return target?.type === "passage" ? target.sourceId : target?.id; });
  assert.equal(new Set(claim.sourceIds).size, 2);
  assert.deepEqual(new Set(sourceIds), new Set(claim.sourceIds));
  assert.equal(targetIds.length, 2);
});

test("future-only claims are omitted and date-only publication precision is retained", () => {
  const sameDay = { title: "Same-day source", url: "https://publisher.example/same-day", publisher: "Publisher", publishedAt: "2026-10-31", snippet: "Publication time unavailable." };
  const priorDay = { ...sameDay, url: "https://publisher.example/prior-day", publishedAt: "2026-10-30" };
  const graph = buildEvidenceGraph({ question: "Historical snapshot", asOf, synthesisMode: "model", assets: [{ ...asset, sources: [...sources, sameDay, priorDay], evidenceBalance: { supporting: [
    { text: "Only future evidence", citedUrls: [sources[2].url] },
    { text: "Prior day date precision", citedUrls: [priorDay.url] },
    { text: "Same day is temporally ambiguous", citedUrls: [sameDay.url] },
  ], counter: [] } }] });
  const claims = graph.nodes.filter(node => node.type === "claim");
  assert.deepEqual(claims.map(node => node.text), ["Prior day date precision"]);
  const source = graph.nodes.find(node => node.type === "source" && node.url === priorDay.url);
  assert.equal(source.publishedAt, "2026-10-30");
  assert.equal(source.temporalStatus, "date_only_before_snapshot");
  assert.equal(graph.nodes.some(node => node.type === "source" && node.url === sameDay.url), false);
});
