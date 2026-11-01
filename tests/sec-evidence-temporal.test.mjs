import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "@/lib/agent-flow-policy") return { url: new URL("../lib/agent-flow-policy.ts", import.meta.url).href, shortCircuit: true };
  return nextResolve(specifier, context);
} });
const { buildEvidenceGraph } = await import("../lib/evidence-graph.ts");
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
