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
        { id: "10-Q:2026-10-31:filing-day", label: "Same-day filing", value: 3, unit: "USD", periodEnd: "2026-09-30", filedAt: "2026-10-31", form: "10-Q", sourceUrl: "https://www.sec.gov/edgar/browse/?CIK=1045810" },
        { id: "10-Q:2026-10-31:revenue", label: "Q3 2026 Revenue", value: 1, unit: "USD", periodEnd: "2026-10-31", filedAt: "2026-11-26", form: "10-Q", sourceUrl: "https://www.sec.gov/edgar/browse/?CIK=1045810" },
        { id: "fake", label: "Non SEC", value: 2, unit: "USD", periodEnd: "2026-07-31", filedAt: "2026-08-27", form: "10-Q", sourceUrl: "https://example.com/filing" },
      ],
    }],
  });
  const facts = graph.nodes.filter(node => node.type === "financial_fact");
  assert.equal(facts.length, 1);
  assert.equal(facts.some(fact => fact.label === "Same-day filing"), false, "date-only SEC filing timestamps are excluded for the whole as-of day");
  assert.equal(facts[0].filedAt, "2026-08-27");
  assert.equal(facts[0].value, 46743000000);
  assert.ok(graph.edges.some(edge => edge.to === facts[0].id && edge.relation === "about"));
});

test("ineligible SEC facts do not consume the graph fact limit", () => {
  const fact = { id: "valid", label: "Revenue", value: 10, unit: "USD", periodEnd: "2026-06-30", filedAt: "2026-08-01", form: "10-Q", sourceUrl: "https://www.sec.gov/filing" };
  const graph = buildEvidenceGraph({ question: "Review filings", asOf: "2026-10-31T20:00:00Z", synthesisMode: "source_only", assets: [{ ticker: "NVDA", issuer: "NVIDIA", summary: "Research only.", stance: "unclear", confidence: 0, sources: [], financialFacts: [...Array.from({ length: 12 }, (_, i) => ({ ...fact, id: `future-${i}`, filedAt: "2026-11-01" })), fact] }] });
  assert.equal(graph.nodes.filter(node => node.type === "financial_fact").length, 1);
});

test("SEC period and instant facts select the latest values filed by the as-of date", async t => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const companyfacts = {
    cik: 1, entityName: "Fixture Corp", facts: { "us-gaap": {
      RevenueFromContractWithCustomerExcludingAssessedTax: { units: { USD: [
        { val: 900, start: "2025-01-01", end: "2025-03-31", filed: "2025-05-01", form: "10-Q", fy: 2025, fp: "Q1" },
        { val: 900, start: "2025-01-01", end: "2025-03-31", filed: "2026-05-01", form: "10-Q", fy: 2025, fp: "Q1" },
        { val: 999, start: "2025-01-01", end: "2025-03-31", filed: "2025-06-01", form: "10-Q", fy: 2025, fp: "Q1" },
        { val: 700, start: "2024-10-01", end: "2024-12-31", filed: "2026-05-01", form: "10-Q" },
      ] } },
      Revenues: { units: { USD: [
        { val: 100, start: "2025-01-01", end: "2025-03-31", filed: "2025-05-01", form: "10-Q", fy: 2025, fp: "Q1" },
        { val: 40, start: "2024-10-01", end: "2024-12-31", filed: "2025-02-01", form: "10-Q" },
        { val: 400, start: "2023-10-01", end: "2024-09-30", filed: "2024-11-15", form: "10-K", fy: 2025, fp: "FY" },
      ] } },
      Assets: { units: { USD: [
        { val: 500, end: "2025-03-31", filed: "2025-05-01", form: "10-Q" },
        { val: 700, end: "2025-03-31", filed: "2025-06-01", form: "10-Q" },
        { val: 900, end: "2025-03-31", filed: "2026-05-01", form: "10-Q" },
      ] } },
      NetIncomeLoss: { units: { USD: [
        { val: 25, start: "2025-01-01", end: "2025-03-31", filed: "2025-05-03", form: "10-Q" },
      ] } },
      CommonStockDividendsPerShareCashPaid: { units: { "USD / shares": [
        { val: 0.5, end: "2025-03-31", filed: "2026-05-01", form: "10-Q" },
      ] } },
      CommonStockDividendsPerShareDeclared: { units: { "USD / shares": [
        { val: 0.25, end: "2025-03-31", filed: "2025-05-01", form: "10-Q" },
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
  assert.equal(result.financials.quarterly[0].revenue, 900, "the priority tag wins when it reports this period");
  assert.equal(result.financials.quarterly.find(period => period.periodEnd === "2025-03-31")?.period, "Q1 FY2025", "SEC fiscal metadata labels the issuer quarter rather than the calendar quarter");
  assert.equal(result.financials.annual.find(period => period.periodEnd === "2024-09-30")?.period, "FY 2025", "SEC fiscal-year metadata is independent of the period-end calendar year");
  assert.equal(result.financials.quarterly[0].totalAssets, 500);
  assert.equal(result.financials.quarterly[0].filed, "2025-05-01");
  assert.deepEqual(result.financials.quarterly[0].filedByMetric, { revenue: "2025-05-01", netIncome: "2025-05-03", totalAssets: "2025-05-01", totalLiabilities: null, operatingCashFlow: null, capitalExpenditure: null });
  assert.equal(result.financials.quarterly.find(period => period.periodEnd === "2024-12-31")?.revenue, 40, "fallback revenue tags are selected after applying the historical as-of cutoff");
  assert.equal(result.dividends[0].amountPerShare, 0.25, "an ineligible preferred dividend tag does not prevent fallback tag selection");
  assert.equal(result.asOf, "2025-06-01T12:00:00.000Z");
  assert.deepEqual(result.limitations, ["For historical as-of research, SEC facts filed on the as-of date are excluded because filing times are unavailable."]);
  assert.notEqual(result.retrievedAt, result.asOf, "retrieval provenance records actual response processing time");

  companyfacts.facts["us-gaap"].RevenueFromContractWithCustomerExcludingAssessedTax.units.USD.push(
    { val: 999, start: "2025-01-01", end: "2025-03-31", filed: "2025-06-01", form: "10-Q" },
    { val: 1000, start: "2025-04-01", end: "2025-06-02", filed: "2025-06-01", form: "10-Q" },
  );
  t.mock.method(Date, "now", () => Date.parse("2025-06-01T12:00:00Z"));
  const live = await getSecCompanyResearch("FIX", null, { includeAnalystTargets: false });
  assert.equal(live.financials.quarterly.find(period => period.periodEnd === "2025-03-31")?.revenue, 999, "live research may include a filing accepted on the current day");
  assert.equal(live.financials.quarterly.some(period => period.periodEnd === "2025-06-02"), false, "live same-day eligibility never admits a future reporting period");
  assert.deepEqual(live.limitations, []);
});
