import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { url: "data:text/javascript,export {};", shortCircuit: true };
  if (specifier === "@/lib/agent-flow-policy") return { url: new URL("../lib/agent-flow-policy.ts", import.meta.url).href, shortCircuit: true };
  return nextResolve(specifier, context);
} });
const { buildEvidenceGraph } = await import("../lib/evidence-graph.ts");
const { getSecCompanyResearch } = await import("../lib/sec-fundamentals.ts");
hooks.deregister();

test("SEC facts retain period and filing dates and omit future information from historical graphs", () => {
  const graph = buildEvidenceGraph({
    question: "Review issuer fundamentals as of Oct 31",
    asOf: "2026-10-31T20:00:00Z",
    synthesisMode: "source_only",
    assets: [{
      ticker: "NVDA", issuer: "NVIDIA", summary: "Research only.", stance: "unclear", confidence: 0, sources: [],
      financialFacts: [
        { id: "10-Q:2026-07-31:revenue", label: "Q2 2026 Revenue", value: 46743000000, unit: "USD", periodEnd: "2026-07-31", filedAt: "2026-08-27", form: "10-Q", sourceUrl: "https://www.sec.gov/edgar/browse/?CIK=1045810" },
        { id: "10-Q:2026-10-31:revenue", label: "Q3 2026 Revenue", value: 1, unit: "USD", periodEnd: "2026-10-31", filedAt: "2026-11-26", form: "10-Q", sourceUrl: "https://www.sec.gov/edgar/browse/?CIK=1045810" },
        { id: "fake", label: "Non SEC", value: 2, unit: "USD", periodEnd: "2026-07-31", filedAt: "2026-08-27", form: "10-Q", sourceUrl: "https://example.com/filing" },
      ],
    }],
  });
  const facts = graph.nodes.filter(node => node.type === "financial_fact");
  assert.equal(facts.length, 1);
  assert.equal(facts[0].filedAt, "2026-08-27");
  assert.equal(facts[0].value, 46743000000);
  assert.ok(graph.edges.some(edge => edge.to === facts[0].id && edge.relation === "about"));
});

test("SEC period and instant facts select the latest values filed by the as-of date", async t => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const companyfacts = {
    cik: 1, entityName: "Fixture Corp", facts: { "us-gaap": {
      RevenueFromContractWithCustomerExcludingAssessedTax: { units: { USD: [
        { val: 100, start: "2025-01-01", end: "2025-03-31", filed: "2025-05-01", form: "10-Q" },
        { val: 900, start: "2025-01-01", end: "2025-03-31", filed: "2026-05-01", form: "10-Q" },
      ] } },
      Assets: { units: { USD: [
        { val: 500, end: "2025-03-31", filed: "2025-05-01", form: "10-Q" },
        { val: 900, end: "2025-03-31", filed: "2026-05-01", form: "10-Q" },
      ] } },
    } },
  };
  globalThis.fetch = async url => {
    if (String(url).includes("company_tickers.json")) return Response.json({ row: { cik_str: 1, ticker: "FIX", title: "Fixture Corp" } });
    if (String(url).includes("/submissions/")) return Response.json({ name: "Fixture Corp" });
    if (String(url).includes("/companyfacts/")) return Response.json(companyfacts);
    throw new Error(`unexpected fetch ${url}`);
  };
  const result = await getSecCompanyResearch("FIX", null, { asOf: "2025-06-01T12:00:00Z", includeAnalystTargets: false });
  assert.equal(result.financials.quarterly[0].revenue, 100);
  assert.equal(result.financials.quarterly[0].totalAssets, 500);
  assert.equal(result.financials.quarterly[0].filed, "2025-05-01");
});
