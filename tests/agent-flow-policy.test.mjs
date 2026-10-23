import test from "node:test";
import assert from "node:assert/strict";
import { extractFlowTickers, gateFlowTrade, isTokenizedMarketQuestion, normalizeFlowAssessment, normalizeFlowAssessments, sourceOnlyAssessment, tokenizedMarketReview } from "../lib/agent-flow-policy.ts";

const now = Date.now();
const sources = [
  { title: "NVDA earnings", url: "https://example.com/a", publisher: "Publisher A", publishedAt: new Date(now - 3600000).toISOString() },
  { title: "NVDA outlook", url: "https://example.org/b", publisher: "Publisher B", publishedAt: new Date(now - 7200000).toISOString() },
];
const assessment = { summary: "Two recent publishers describe an earnings and outlook development requiring an original-source check.", stance: "bullish", confidence: 0.8, citedUrls: sources.map(item => item.url), risks: ["Gap risk"], nextCheck: "Read the issuer release" };
const base = { assessment, sources, marketVerified: true, marketTimestamp: now - 30000, lastCompletedCandleEnd: now - 3600000, completedCandles: 80, currentSignal: true, previousSignal: false, now };

test("rToken research scope requires explicit instrument wording or an rTicker", () => {
  assert.equal(isTokenizedMarketQuestion("What are the key risks around NVDA right now?", ["NVDA"]), false);
  assert.equal(isTokenizedMarketQuestion("Is the rNVDA market supported by evidence?", ["NVDA"]), true);
  assert.equal(isTokenizedMarketQuestion("Review RNVDAUSDT liquidity", ["NVDA"]), true);
  assert.equal(isTokenizedMarketQuestion("Review the tokenized market for NVIDIA", ["NVDA"]), true);
  assert.equal(isTokenizedMarketQuestion("Is the NVDA stock market worth reviewing?", ["NVDA"]), false);
});

test("source-only rToken research distinguishes issuer coverage from token-market evidence", () => {
  const result = sourceOnlyAssessment({ ticker: "NVDA", headlineCount: 40, publishers: 19, latestTitle: "NVIDIA issuer update", latestPublisher: "Example News", latestDate: "Oct 21, 2026", tokenizedMarketQuestion: true, perpSymbol: "NVDAUSDT", perpPrice: 220, perpTimestamp: now });
  assert.match(result.summary, /not the rNVDA token market/i);
  assert.match(result.summary, /No verified rNVDA tokenized-spot quote/);
  assert.match(result.summary, /stock-perpetual reference, not the rToken/i);
  assert.match(result.summary, /liquidity, spread, and premium or discount were not measured/i);
  assert.match(result.summary, /not enough evidence/i);
  assert.equal(result.stance, "unclear");
  assert.equal(result.confidence, 0);
});

test("tokenized market verdict separates due diligence from trading merit and reports quote age", () => {
  const fresh = tokenizedMarketReview({ ticker: "NVDA", spotSymbol: "RNVDAUSDT", spotPrice: 220, spotTimestamp: now - 30_000, now });
  assert.match(fresh.verdict, /Worth a closer due-diligence review/);
  assert.match(fresh.verdict, /does not establish rNVDA tradability/);
  assert.equal(fresh.quoteStatus, "fresh");
  const stale = tokenizedMarketReview({ ticker: "NVDA", spotSymbol: "RNVDAUSDT", spotPrice: 220, spotTimestamp: now - 180_000, now });
  assert.equal(stale.quoteStatus, "stale");
  const absent = tokenizedMarketReview({ ticker: "NVDA", spotSymbol: null, spotPrice: null, spotTimestamp: null, now });
  assert.match(absent.verdict, /no verified tokenized-spot quote/);
  assert.equal(absent.quoteStatus, "unavailable");
});

test("the coordinator recognizes only supported US stock underlyings", () => {
  assert.deepEqual(extractFlowTickers("What do you think about NVDA and TSLA?", ["NVDAUSDT", "TSLAUSDT", "AMDUSDT"]), ["NVDA", "TSLA"]);
  assert.deepEqual(extractFlowTickers("rNVDAUSDT and NVIDIA", ["NVDAUSDT"]), ["NVDA"]);
  assert.deepEqual(extractFlowTickers("Should I check BTC?", ["NVDAUSDT"]), []);
  assert.deepEqual(extractFlowTickers("Is the rNVDA market worth reviewing?", ["NVDAUSDT"]), ["NVDA"]);
});

test("a handoff requires independently cited current coverage, fresh verified market, and agreeing new signal", () => {
  assert.equal(gateFlowTrade(base).tradeable, true);
  assert.equal(gateFlowTrade({ ...base, currentSignal: false, previousSignal: false }).tradeable, false);
  assert.equal(gateFlowTrade({ ...base, marketTimestamp: now - 180000 }).tradeable, false);
  assert.equal(gateFlowTrade({ ...base, sources: sources.slice(0, 1) }).tradeable, false);
  assert.equal(gateFlowTrade({ ...base, assessment: { ...assessment, stance: "mixed" } }).tradeable, false);
  assert.equal(gateFlowTrade({ ...base, assessment: { ...assessment, confidence: 0.5 } }).tradeable, false);
});

test("source-bound assessment discards fabricated citations before the gate", () => {
  const result = normalizeFlowAssessment({ ...assessment, citedUrls: [sources[0].url, "https://elsewhere.invalid/claim"] }, sources);
  assert.deepEqual(result?.citedUrls, [sources[0].url]);
  assert.equal(gateFlowTrade({ ...base, assessment: result }).tradeable, false);
});

test("directional confidence is capped and stance becomes unclear without two recent cited publishers", () => {
  const oneCitation = normalizeFlowAssessment({ ...assessment, citedUrls: [sources[0].url] }, sources, now);
  assert.equal(oneCitation?.stance, "unclear");
  assert.equal(oneCitation?.confidence, 0.4);
  assert.equal(oneCitation?.confidenceCapped, true);
  assert.ok(oneCitation?.risks.some((risk) => risk.includes("capped at 40%")));

  const staleSources = sources.map((source) => ({ ...source, publishedAt: new Date(now - 8 * 86_400_000).toISOString() }));
  const stale = normalizeFlowAssessment(assessment, staleSources, now);
  assert.equal(stale?.stance, "unclear");
  assert.equal(stale?.confidence, 0.4);
  assert.equal(stale?.confidenceCapped, true);
});

test("uncited publishers cannot supply the independent evidence required for a handoff", () => {
  const samePublisher = { ...sources[0], url: "https://example.com/second-story" };
  assert.equal(gateFlowTrade({ ...base, sources: [...sources, samePublisher], assessment: { ...assessment, citedUrls: [sources[0].url, samePublisher.url] } }).tradeable, false);
});

test("market freshness rejects invalid clocks and preserves the two-minute boundary", () => {
  for (const marketTimestamp of [null, 0, NaN, Infinity, -Infinity, now - 120001, now + 60001]) {
    assert.equal(gateFlowTrade({ ...base, marketTimestamp }).tradeable, false, String(marketTimestamp));
  }
  for (const marketTimestamp of [now - 120000, now + 60000]) {
    assert.equal(gateFlowTrade({ ...base, marketTimestamp }).tradeable, true);
  }
  assert.equal(gateFlowTrade({ ...base, now: NaN }).tradeable, false);
});

test("only valid completed-candle counts and times satisfy the Alpha gate", () => {
  for (const completedCandles of [NaN, Infinity, 59, 60.5]) {
    assert.equal(gateFlowTrade({ ...base, completedCandles }).tradeable, false);
  }
  for (const lastCompletedCandleEnd of [null, 0, NaN, Infinity, now + 1, now - 6 * 3600000 - 1]) {
    assert.equal(gateFlowTrade({ ...base, lastCompletedCandleEnd }).tradeable, false);
  }
  assert.equal(gateFlowTrade({ ...base, completedCandles: 60, lastCompletedCandleEnd: now - 6 * 3600000 }).tradeable, true);
});

test("provider confidence must be a finite numeric probability, never coerced from other JSON types", () => {
  for (const confidence of [true, false, null, [], [1], "0.9", NaN, Infinity, -1, 1.1]) {
    assert.equal(normalizeFlowAssessment({ ...assessment, confidence }, sources), null, String(confidence));
  }
  for (const confidence of [NaN, Infinity, -1, 1.1]) {
    assert.equal(gateFlowTrade({ ...base, assessment: { ...assessment, confidence } }).tradeable, false);
  }
  assert.equal(normalizeFlowAssessment({ ...assessment, confidence: 0.75 }, sources)?.confidence, 0.75);
});

test("provider responses must include a valid assessment for each requested company", () => {
  const requested = { NVDA: sources, TSLA: sources };
  const nvda = { ...assessment, ticker: "NVDA" };
  const tsla = { ...assessment, ticker: " tsla " };
  for (const response of [{}, { assets: [] }, { assets: [nvda] }, { assets: [nvda, { ...tsla, confidence: true }] }]) {
    assert.equal(normalizeFlowAssessments(response, requested), null);
  }
  const normalized = normalizeFlowAssessments({ assets: [nvda, tsla] }, requested);
  assert.deepEqual(Object.keys(normalized), ["NVDA", "TSLA"]);
  assert.equal(normalized.TSLA.confidence, 0.8);
  assert.equal(normalizeFlowAssessments({ assets: [nvda] }, {}), null);
});

test("unknown companies and duplicate provider assessments cannot overwrite the first valid requested result", () => {
  const nvda = { ...assessment, ticker: "NVDA" };
  const response = { assets: [null, [], { ...nvda, ticker: "__proto__" }, { ...nvda, confidence: null }, nvda, { ...nvda, confidence: 1 }, { ...nvda, ticker: "TSLA" }] };
  const normalized = normalizeFlowAssessments(response, { NVDA: sources });
  assert.deepEqual(Object.keys(normalized), ["NVDA"]);
  assert.equal(normalized.NVDA.confidence, 0.8);
  assert.equal(normalizeFlowAssessment({ ...assessment, stance: ["bullish"] }, sources), null);
});

test("two-sided evidence only retains points tied to supplied source URLs", () => {
  const balanced = normalizeFlowAssessment({
    ...assessment,
    supportingEvidence: [
      { text: "A current source describes stronger cloud demand.", citedUrls: [sources[0].url] },
      { text: "This point cites an invented source.", citedUrls: ["https://elsewhere.invalid/fabricated"] },
      { text: "No citation should be discarded.", citedUrls: [] },
    ],
    counterEvidence: [
      { text: "A second publisher flags a slower outlook.", citedUrls: [sources[1].url] },
    ],
  }, sources);
  assert.deepEqual(balanced?.supportingEvidence, [{ text: "A current source describes stronger cloud demand.", citedUrls: [sources[0].url] }]);
  assert.deepEqual(balanced?.counterEvidence, [{ text: "A second publisher flags a slower outlook.", citedUrls: [sources[1].url] }]);
});
