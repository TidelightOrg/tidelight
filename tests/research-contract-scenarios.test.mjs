import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { classifyMacroQuestion } from "../lib/macro-research-sources.ts";
import { extractFlowTickers, gateFlowTrade, isTokenizedMarketQuestion, normalizeFlowAssessment, sourceOnlyAssessment, tokenizedMarketReview } from "../lib/agent-flow-policy.ts";

const suite = JSON.parse(await readFile(new URL("../docs/benchmarks/research-contract-scenarios-v1.json", import.meta.url), "utf8"));
const NOW = Date.parse("2026-10-01T12:00:00Z");
const twoSources = [
  { title: "Primary release", url: "https://issuer.example/release", publisher: "Issuer", publishedAt: new Date(NOW - 3600000).toISOString() },
  { title: "Independent context", url: "https://publisher.example/story", publisher: "Independent Publisher", publishedAt: new Date(NOW - 7200000).toISOString() },
];
const assessment = (stance, extra = {}) => ({ summary: "A bounded evidence assessment with explicit uncertainty and a next verification step.", stance, confidence: 0.8, citedUrls: twoSources.map(source => source.url), supportingEvidence: [{ text: "The captured source states the reported event plainly.", citedUrls: [twoSources[0].url] }], counterEvidence: [{ text: "The second captured source reports a material qualification.", citedUrls: [twoSources[1].url] }], risks: [], nextCheck: "Review the original release.", ...extra });

assert.equal(suite.metadata.status, "deterministic_fixture_contracts_only");
assert.equal(suite.metadata.independentHumanReview, false);
assert.equal(suite.metadata.researchQualityScore, null);

for (const scenario of suite.scenarios) {
  test(`research contract: ${scenario.id}`, () => {
    const { input, expected } = scenario;
    if (scenario.kind === "source_only" || scenario.kind === "provider_outage") {
      const result = sourceOnlyAssessment(input);
      assert.equal(result.stance, expected.stance);
      assert.equal(result.confidence, expected.confidence);
      assert.match(result.summary, /AI synthesis is unavailable/i);
      assert.ok(!result.summary.toLowerCase().includes("buy"));
      return;
    }
    if (scenario.kind === "source_failure") {
      const result = sourceOnlyAssessment(input);
      assert.equal(result.stance, expected.stance);
      assert.match(result.summary, /No attributable public headlines/i);
      assert.ok(!result.summary.toLowerCase().includes("not enough evidence to judge"));
      return;
    }
    if (scenario.kind === "macro_classification") {
      assert.equal(classifyMacroQuestion(input.question), expected.topic);
      return;
    }
    if (scenario.kind === "instrument_identity") {
      assert.equal(isTokenizedMarketQuestion(input.issuerQuestion, input.tickers), expected.issuerIsToken);
      assert.equal(isTokenizedMarketQuestion(input.tokenQuestion, input.tickers), expected.tokenIsToken);
      assert.deepEqual(extractFlowTickers(`${input.tokenQuestion} vs NVDAUSDT`, input.contracts), expected.extractedUnderlying);
      return;
    }
    if (scenario.kind === "token_review") {
      const now = NOW;
      const result = tokenizedMarketReview({ ticker: input.ticker, spotSymbol: input.spotSymbol, spotPrice: input.spotPrice, spotTimestamp: input.ageMs == null ? null : now - input.ageMs, now });
      assert.equal(result.quoteStatus, expected.quoteStatus);
      if (expected.doesNotEstablishTradability) assert.match(result.verdict, /does not establish.*tradability/i);
      if (expected.notEnoughEvidence) assert.match(result.verdict, /not enough evidence/i);
      return;
    }
    if (scenario.kind === "future_source") {
      const source = { ...twoSources[0], publishedAt: new Date(NOW + input.futureOffsetMs).toISOString() };
      const result = normalizeFlowAssessment(assessment("bullish"), [source, twoSources[1]], NOW);
      assert.equal(result.stance, expected.stance);
      assert.equal(result.confidenceCapped, expected.confidenceCapped);
      assert.ok(result.confidence <= expected.confidenceMax);
      return;
    }
    if (scenario.kind === "stale_market_gate") {
      const result = normalizeFlowAssessment(assessment("bullish"), twoSources, NOW);
      const gate = gateFlowTrade({ assessment: result, sources: twoSources, marketVerified: true, marketTimestamp: NOW - input.marketAgeMs, lastCompletedCandleEnd: NOW - 3600000, completedCandles: 80, currentSignal: true, previousSignal: false, now: NOW });
      assert.equal(gate.tradeable, expected.tradeable);
      assert.ok(gate.reasons.some(reason => reason.includes("unavailable or stale")) === expected.staleReason);
      return;
    }
    if (scenario.kind === "contradiction") {
      const result = normalizeFlowAssessment(assessment("mixed"), twoSources, NOW);
      assert.equal(result.stance, expected.stance);
      const gate = gateFlowTrade({ assessment: result, sources: twoSources, marketVerified: true, marketTimestamp: NOW - 1000, lastCompletedCandleEnd: NOW - 3600000, completedCandles: 80, currentSignal: true, previousSignal: false, now: NOW });
      assert.equal(gate.tradeable, expected.tradeable);
      assert.ok(gate.reasons.some(reason => reason.includes("directional scenario")));
      return;
    }
    if (scenario.kind === "unsupported_citation") {
      const forgedUrl = "https://unretrieved.example/claim";
      const result = normalizeFlowAssessment(assessment("bullish", { citedUrls: [forgedUrl], supportingEvidence: [{ text: "An uncaptured source allegedly supports this claim.", citedUrls: [forgedUrl] }] }), twoSources, NOW);
      assert.deepEqual(result.citedUrls, expected.citedUrls);
      assert.equal(result.supportingEvidence.length, expected.supportingEvidenceCount);
      assert.equal(result.stance, "unclear");
      assert.equal(result.confidence, 0.4);
      return;
    }
    if (scenario.kind === "malformed_assessment") {
      assert.equal(normalizeFlowAssessment(input.payload, twoSources, NOW) !== null, expected.assessmentAccepted);
      return;
    }
    assert.fail(`No contract evaluator for scenario kind: ${scenario.kind}`);
  });
}

test("contract scenario set spans the required research and failure domains", () => {
  const categories = new Set(suite.scenarios.map(scenario => scenario.category));
  for (const category of ["issuer_earnings", "macro", "instrument_identity", "provider_failure", "contradictions", "freshness"]) assert.ok(categories.has(category), `missing ${category}`);
  assert.equal(suite.scenarios.length, 13);
});
