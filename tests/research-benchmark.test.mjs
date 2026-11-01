import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { scoreBenchmark } from "../scripts/score-research-benchmark.mjs";

function event(index, options = {}) {
  const sourceUrl = `https://issuer${index % 3}.example/news/${index}`;
  const sources = [
    { url: sourceUrl, sourceClass: "primary", accessible: true, capturedText: "Full captured source text", publicationAt: null, capturedAt: "2026-10-05T09:00:00Z" },
    { url: `https://publisher${index % 2}.example/story/${index}`, sourceClass: "independent_reporting", accessible: false, capturedText: "", publicationAt: null, capturedAt: "2026-10-05T09:00:00Z" },
  ];
  return {
    id: `event-${index}`,
    category: ["issuer", "sector", "macro"][index % 3],
    question: `What changed in public event ${index}?`,
    askedAt: "2026-10-05T09:00:00Z",
    taskTimeSeconds: 40 + index,
    sources,
    claims: [{
      text: `A factual claim for event ${index}`,
      kind: "factual",
      quote: "The matched source passage",
      sourceUrl,
      reviewers: [
        { reviewerId: "a", quoteMatch: "exact", entailment: "supported", sourceFit: "primary", interpretationBoundary: "sourced_fact" },
        { reviewerId: "b", quoteMatch: "exact", entailment: "supported", sourceFit: "primary", interpretationBoundary: "sourced_fact" },
      ],
      resolution: { quoteMatch: "exact", entailment: "supported", sourceFit: "primary", interpretationBoundary: "sourced_fact", adjudicatorId: "a" },
    }],
    review: { counterEvidenceInCapturedSources: index === 0 },
    brief: { counterEvidencePresent: index === 0 && options.counterEvidenceCaptured === true },
    ...options.overrides,
  };
}

function completeBenchmark() {
  return { schemaVersion: 1, metadata: { promptVersion: "baseline" }, events: Array.from({ length: 10 }, (_, index) => event(index)) };
}

test("scores rates with raw counts and leaves empty counter-evidence denominator unmeasured", () => {
  const result = scoreBenchmark(completeBenchmark());
  assert.equal(result.complete, true);
  assert.deepEqual(result.metrics.citationCoverage, { status: "measured", numerator: 10, denominator: 10, ratePct: 100 });
  assert.deepEqual(result.metrics.counterEvidenceCoverage, { status: "measured", numerator: 0, denominator: 1, ratePct: 0 });
  assert.equal(result.metrics.sourceDiversity.meanDistinctDomainsPerEvent, 2);
  assert.deepEqual(result.metrics.taskTimeSeconds, { count: 10, median: 44.5, minimum: 40, maximum: 49 });
});

test("allows protocol task time to remain explicitly unmeasured", () => {
  const benchmark = completeBenchmark();
  benchmark.events.forEach((item) => {
    item.askedAt = null;
    item.taskTimeSeconds = null;
  });
  const result = scoreBenchmark(benchmark);
  assert.equal(result.complete, true);
  assert.deepEqual(result.metrics.taskTimeSeconds, { status: "not_measured", count: 0, median: null, minimum: null, maximum: null });
});

test("rejects malformed task-time values instead of treating them as missing", () => {
  const benchmark = completeBenchmark();
  benchmark.events[0].taskTimeSeconds = "40 seconds";
  const result = scoreBenchmark(benchmark);
  assert.equal(result.complete, false);
  assert.ok(result.errors.some((error) => error.includes("taskTimeSeconds must be a positive number or null")));
});

test("does not turn an empty evidence denominator into a zero-percent score", () => {
  const benchmark = completeBenchmark();
  benchmark.events.forEach((item) => { item.review.counterEvidenceInCapturedSources = false; });
  const result = scoreBenchmark(benchmark);
  assert.equal(result.metrics.counterEvidenceCoverage.status, "not_measured");
  assert.equal(result.metrics.counterEvidenceCoverage.ratePct, null);
  assert.equal(result.metrics.counterEvidenceCoverage.denominator, 0);
});

test("blocks completion when event, category, or independent review requirements are missing", () => {
  const benchmark = completeBenchmark();
  benchmark.events = benchmark.events.slice(0, 9);
  benchmark.events.forEach((item) => { item.category = "issuer"; });
  benchmark.events[0].claims[0].reviewers = [benchmark.events[0].claims[0].reviewers[0]];
  const result = scoreBenchmark(benchmark);
  assert.equal(result.complete, false);
  assert.equal(result.metrics, null);
  assert.ok(result.errors.some((error) => error.includes("At least 10 events")));
  assert.ok(result.errors.some((error) => error.includes("three event categories")));
  assert.ok(result.errors.some((error) => error.includes("two reviewers")));
});

test("counts unsupported factual assertions from adjudicated labels", () => {
  const benchmark = completeBenchmark();
  benchmark.events[0].claims[0].resolution.entailment = "not_established";
  benchmark.events[0].claims[0].resolution.quoteMatch = "unsupported";
  const result = scoreBenchmark(benchmark);
  assert.deepEqual(result.metrics.unsupportedClaimRate, { status: "measured", numerator: 1, denominator: 10, ratePct: 10 });
});

test("reports observed runtime and provider availability separately while claim review is pending", () => {
  const benchmark = completeBenchmark();
  benchmark.events[0].run_capture = { status: "source_only", observedElapsedUiSeconds: 42, sourcesReturned: 7, aiSynthesis: "unavailable", claimsValidated: false };
  benchmark.events[1].run_capture = { status: "model", observedElapsedUiSeconds: 30, sourcesReturned: 12, aiSynthesis: "Gemini", claimsValidated: false };
  benchmark.events[0].claims[0].reviewers = [];
  const result = scoreBenchmark(benchmark);
  assert.equal(result.complete, false, "operational observations do not bypass independent claim review");
  assert.equal(result.metrics, null);
  assert.deepEqual(result.operationalObservations.captureCoverage, { status: "measured", numerator: 2, denominator: 10, ratePct: 20 });
  assert.deepEqual(result.operationalObservations.observedRunStatuses, { model: 1, source_only: 1 });
  assert.deepEqual(result.operationalObservations.observedSynthesisStatuses, { Gemini: 1, unavailable: 1 });
  assert.deepEqual(result.operationalObservations.uiElapsedSeconds, { count: 2, median: 36, minimum: 30, maximum: 42, interpretation: "Observed UI elapsed time; not protocol task time or provider latency." });
  assert.equal(result.operationalObservations.researchQuality.status, "not_measured");
});

test("malformed claim URLs fail validation instead of crashing the benchmark scorer", () => {
  const benchmark = completeBenchmark();
  benchmark.events[0].claims[0].sourceUrl = "http://[invalid";
  const result = scoreBenchmark(benchmark);
  assert.equal(result.complete, false);
  assert.ok(result.errors.some((error) => error.includes("sourceUrl must match one captured source URL")));
});

test("frozen production captures expose operational observations without inventing a quality score", async () => {
  const frozen = JSON.parse(await readFile(new URL("../docs/benchmarks/research-benchmark-frozen-2026-10-24.json", import.meta.url), "utf8"));
  const report = JSON.parse(await readFile(new URL("../docs/benchmarks/research-benchmark-operational-observations-2026-10-24.json", import.meta.url), "utf8"));
  const result = scoreBenchmark(frozen);
  assert.equal(result.complete, false);
  assert.equal(result.metrics, null);
  assert.deepEqual(result.operationalObservations.captureCoverage, { status: "measured", numerator: 9, denominator: 10, ratePct: 90 });
  assert.equal(result.operationalObservations.unmatchedRunCaptures.length, 1);
  assert.equal(result.operationalObservations.unmatchedRunCaptures[0].reportedQuestion, "Federal Reserve January 2026 decision");
  assert.deepEqual(result.operationalObservations.observedRunStatuses, { limited_model_response: 1, model_synthesis: 2, no_attributable_sources: 1, source_only: 5 });
  assert.deepEqual(result.operationalObservations.observedSynthesisStatuses, { Gemini: 2, Qwen: 1, not_attempted: 1, unavailable: 5 });
  assert.deepEqual(result.operationalObservations.uiElapsedSeconds, { count: 9, median: 32, minimum: 3, maximum: 42, interpretation: "Observed UI elapsed time; not protocol task time or provider latency." });
  assert.deepEqual(result.operationalObservations.modelReportedConfidencePercent, { count: 1, median: 10, minimum: 10, maximum: 10, capturesWithValue: 1, capturesWithoutValue: 8, interpretation: "Only values explicitly attributed to the model; not a calibrated probability or quality score." });
  assert.equal(result.operationalObservations.uiConfidencePercent.count, 3);
  assert.equal(result.operationalObservations.sourcesReturned.capturesWithCount, 7);
  assert.equal(result.operationalObservations.claimsMarkedValidated.status, "not_measured");
  assert.equal(result.operationalObservations.researchQuality.status, "not_measured");
  assert.equal(report.status, "OPERATIONAL_OBSERVATIONS_ONLY");
  assert.deepEqual(report.operationalObservations, result.operationalObservations, "published observation artifact must match the reproducible scorer");
  assert.equal(report.claimQuality.status, "not_measured");
});
