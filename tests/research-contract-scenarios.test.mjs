import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import { classifyMacroQuestion } from "../lib/macro-research-sources.ts";
import { extractFlowTickers, gateFlowTrade, isTokenizedMarketQuestion, normalizeFlowAssessment, sourceOnlyAssessment, tokenizedMarketReview } from "../lib/agent-flow-policy.ts";

const importHooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "data:text/javascript,export {};", shortCircuit: true };
    if (specifier === "@/lib/supabase/admin") return { url: "data:text/javascript,export const createAdminClient=()=>globalThis.__providerHealthAdmin?.() ?? {from:()=>({select(){return this},gte(){return this},order(){return this},limit(){return this},abortSignal(){return Promise.resolve({data:[],error:null})}})};", shortCircuit: true };
    if (specifier === "./provider-health" && context.parentURL?.endsWith("/lib/ai-fallback.ts")) return { url: new URL("../lib/provider-health.ts", import.meta.url).href, shortCircuit: true };
    return nextResolve(specifier, context);
  },
});
const { aiJsonWithFallback } = await import("../lib/ai-fallback.ts");
importHooks.deregister();

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
  test(`research contract: ${scenario.id}`, async t => {
    const { input, expected } = scenario;
    if (scenario.kind === "source_only") {
      const result = sourceOnlyAssessment(input);
      assert.equal(result.stance, expected.stance);
      assert.equal(result.confidence, expected.confidence);
      assert.equal(["bullish", "bearish"].includes(result.stance), expected.directional);
      assert.match(result.summary, /AI synthesis is unavailable/i);
      assert.ok(!result.summary.toLowerCase().includes("buy"));
      return;
    }
    if (scenario.kind === "provider_outage") {
      const keys = ["BITGET_QWEN_API_KEY", "BITGET_QWEN_MODEL", "BITGET_QWEN_BASE_URL", "GEMINI_API_KEY", "GEMINI_MODEL"];
      const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
      t.after(() => { for (const key of keys) { if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key]; } });
      process.env.BITGET_QWEN_API_KEY = "fixture-qwen-key";
      process.env.BITGET_QWEN_MODEL = "fixture-qwen";
      process.env.BITGET_QWEN_BASE_URL = "https://hackathon.bitgetops.com/v1";
      process.env.GEMINI_API_KEY = "fixture-gemini-key";
      process.env.GEMINI_MODEL = "fixture-gemini";
      const attempts = [];
      const question = "fixture-only research question";
      t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ error: { status: "UNAVAILABLE", message: `provider failure for ${question}` } }), { status: 503, headers: { "content-type": "application/json" } }));
      const warnings = [];
      t.mock.method(console, "warn", (...args) => warnings.push(args));
      await assert.rejects(aiJsonWithFallback([{ role: "user", content: question }], () => false, { budgetMs: 5000, onAttempt: attempt => attempts.push(attempt) }));
      assert.ok(attempts.length >= 3, "both providers should exhaust bounded failure attempts");
      assert.deepEqual([...new Set(attempts.map(attempt => attempt.provider))].sort(), ["gemini", "qwen"]);
      for (const provider of ["qwen", "gemini"]) {
        const count = attempts.filter(attempt => attempt.provider === provider).length;
        assert.ok(count >= 1 && count <= 2, `${provider} must remain within its retry bound`);
      }
      assert.ok(attempts.every(attempt => attempt.outcome === "http_error" && attempt.httpStatus === 503));
      assert.ok(warnings.length > 0, "provider failures emit warnings");
      assert.ok(warnings.every(warning => !JSON.stringify(warning).includes(question)));
      const result = sourceOnlyAssessment(input);
      assert.equal(result.stance, expected.stance);
      assert.equal(result.confidence, expected.confidence);
      assert.equal(["bullish", "bearish"].includes(result.stance), expected.directional);
      assert.match(result.summary, /AI synthesis is unavailable/i);
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
      assert.deepEqual(extractFlowTickers(input.tokenQuestion, input.contracts), expected.extractedUnderlying);
      assert.deepEqual(extractFlowTickers("NVDAUSDT", input.contracts), expected.extractedUnderlying);
      return;
    }
    if (scenario.kind === "token_review") {
      const now = NOW;
      const result = tokenizedMarketReview({ ticker: input.ticker, spotSymbol: input.spotSymbol, spotPrice: input.spotPrice, spotTimestamp: input.ageMs == null ? null : now - input.ageMs, now });
      assert.equal(result.quoteStatus, expected.quoteStatus);
      if (expected.doesNotEstablishTradability) assert.match(result.verdict, /does not establish.*tradability/i);
      if (expected.notEnoughEvidence) {
        assert.match(result.verdict, /not enough evidence/i);
        const sourceOnly = sourceOnlyAssessment({ ticker: input.ticker, headlineCount: 2, publishers: 2, tokenizedMarketQuestion: true, perpSymbol: input.perpSymbol });
        assert.match(sourceOnly.summary, /NVDAUSDT is a stock-perpetual reference, not the rToken/i);
      }
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
