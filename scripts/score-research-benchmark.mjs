#!/usr/bin/env node

import { readFile } from "node:fs/promises";

const SOURCE_CLASSES = new Set(["primary", "independent_reporting", "known_publisher", "user_supplied_unverified"]);
const QUOTE_MATCH = new Set(["exact", "substantially_exact", "unsupported"]);
const ENTAILMENT = new Set(["supported", "contradicted", "context_only", "not_established"]);
const SOURCE_FIT = new Set(["primary", "independent_reporting", "known_publisher", "user_supplied_unverified"]);
const INTERPRETATION = new Set(["sourced_fact", "analyst_inference", "unsupported_assertion"]);

function ratio(numerator, denominator) {
  return denominator
    ? { status: "measured", numerator, denominator, ratePct: Math.round((numerator / denominator) * 10000) / 100 }
    : { status: "not_measured", numerator: null, denominator: 0, ratePct: null };
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function distinctSourceValues(sources, selector) {
  return new Set(sources.map(selector).filter(Boolean));
}

function distribution(values) {
  const finite = values.filter((value) => Number.isFinite(value) && value >= 0);
  if (!finite.length) return { count: 0, median: null, minimum: null, maximum: null };
  return { count: finite.length, median: median(finite), minimum: Math.min(...finite), maximum: Math.max(...finite) };
}

function validateRunCapture(capture, label, errors, { required = false } = {}) {
  if (capture === undefined || capture === null) {
    if (required) errors.push(`${label} must be an object.`);
    return false;
  }
  if (typeof capture !== "object" || Array.isArray(capture)) {
    errors.push(`${label} must be an object${required ? "" : " or null when provided"}.`);
    return false;
  }
  const invalid = [];
  if (capture.observedElapsedUiSeconds !== null && capture.observedElapsedUiSeconds !== undefined && (typeof capture.observedElapsedUiSeconds !== "number" || !Number.isFinite(capture.observedElapsedUiSeconds) || capture.observedElapsedUiSeconds < 0)) invalid.push("observedElapsedUiSeconds must be a finite nonnegative number when recorded");
  if (capture.sourcesReturned !== null && capture.sourcesReturned !== undefined && (!Number.isSafeInteger(capture.sourcesReturned) || capture.sourcesReturned < 0)) invalid.push("sourcesReturned must be a nonnegative safe integer when recorded");
  if (capture.confidencePercent !== null && capture.confidencePercent !== undefined && (typeof capture.confidencePercent !== "number" || !Number.isFinite(capture.confidencePercent) || capture.confidencePercent < 0 || capture.confidencePercent > 100)) invalid.push("confidencePercent must be between 0 and 100 when recorded");
  if (capture.confidencePercent !== null && capture.confidencePercent !== undefined && !["model_reported", "application_fallback"].includes(capture.confidenceOrigin)) invalid.push("confidenceOrigin must be model_reported or application_fallback when confidencePercent is recorded");
  if (capture.confidenceOrigin !== null && capture.confidenceOrigin !== undefined && !["model_reported", "application_fallback"].includes(capture.confidenceOrigin)) invalid.push("confidenceOrigin must be model_reported or application_fallback when recorded");
  errors.push(...invalid.map(message => `${label}.${message}.`));
  return invalid.length === 0;
}

/** Operational captures are observable facts, not reviewer-scored research quality. */
function scoreOperationalObservations(events, unmatchedRunCaptures = []) {
  const errors = [];
  const captures = events.flatMap((event, eventIndex) => {
    const capture = event?.run_capture;
    if (capture === undefined || capture === null) return [];
    if (!validateRunCapture(capture, `events[${eventIndex}].run_capture`, errors)) return [];
    // A template may contain an all-null placeholder. Count only a capture
    // with an observed run status or another concrete observation field.
    const hasObservation = capture && typeof capture === "object" && (
      (typeof capture.status === "string" && capture.status.trim())
      || (typeof capture.aiSynthesis === "string" && capture.aiSynthesis.trim())
      || Number.isFinite(capture.observedElapsedUiSeconds)
      || Number.isSafeInteger(capture.sourcesReturned)
      || typeof capture.claimsValidated === "boolean"
      || (typeof capture.confidencePercent === "number" && Number.isFinite(capture.confidencePercent))
      || (typeof capture.quoteFreshness === "string" && capture.quoteFreshness.trim())
      || (typeof capture.observation === "string" && capture.observation.trim())
      || typeof capture.marketOrTradingHandoff === "boolean"
    );
    return hasObservation
      ? [{ event, capture }]
      : [];
  });
  const countValues = (selector) => Object.fromEntries([...new Set(captures.map(({ capture }) => selector(capture)).filter((value) => typeof value === "string" && value))]
    .sort().map((value) => [value, captures.filter(({ capture }) => selector(capture) === value).length]));
  const elapsed = captures.map(({ capture }) => capture.observedElapsedUiSeconds).filter((value) => Number.isFinite(value) && value >= 0);
  const sourceCounts = captures.map(({ capture }) => capture.sourcesReturned).filter((value) => Number.isSafeInteger(value) && value >= 0);
  const confidence = captures.filter(({ capture }) => capture.confidenceOrigin === "model_reported" && capture.aiSynthesis !== "unavailable" && capture.aiSynthesis !== "not_attempted").map(({ capture }) => capture.confidencePercent).filter((value) => Number.isFinite(value) && value >= 0 && value <= 100);
  const uiConfidence = captures.map(({ capture }) => capture.confidencePercent).filter((value) => Number.isFinite(value) && value >= 0 && value <= 100);
  const validatedClaims = captures.filter(({ capture }) => capture.claimsValidated === true).length;
  const validationObservations = captures.filter(({ capture }) => typeof capture.claimsValidated === "boolean").length;
  const quoteFreshnessObservations = countValues((capture) => capture.quoteFreshness);
  const handoffObservations = captures.filter(({ capture }) => typeof capture.marketOrTradingHandoff === "boolean");
  return {
    errors,
    capturedRuns: captures.length,
    unmatchedRunCaptures: Array.isArray(unmatchedRunCaptures) ? unmatchedRunCaptures : [],
    captureCoverage: ratio(captures.length, events.length),
    observedRunStatuses: countValues((capture) => capture.status),
    observedSynthesisStatuses: countValues((capture) => capture.aiSynthesis),
    uiElapsedSeconds: { ...distribution(elapsed), interpretation: "Observed UI elapsed time; not protocol task time or provider latency." },
    sourcesReturned: { ...distribution(sourceCounts), capturesWithCount: sourceCounts.length, capturesWithoutCount: captures.length - sourceCounts.length },
    modelReportedConfidencePercent: { ...distribution(confidence), capturesWithValue: confidence.length, capturesWithoutValue: captures.length - confidence.length, interpretation: "Only values explicitly attributed to the model; not a calibrated probability or quality score." },
    uiConfidencePercent: { ...distribution(uiConfidence), capturesWithValue: uiConfidence.length, capturesWithoutValue: captures.length - uiConfidence.length, interpretation: "Displayed confidence, including application fallback values; not necessarily model-reported or calibrated." },
    quoteFreshnessObservations,
    marketOrTradingHandoff: {
      count: handoffObservations.filter(({ capture }) => capture.marketOrTradingHandoff === true).length,
      noHandoff: handoffObservations.filter(({ capture }) => capture.marketOrTradingHandoff === false).length,
      capturesWithObservation: handoffObservations.length,
      capturesWithoutObservation: captures.length - handoffObservations.length,
    },
    claimsMarkedValidated: { count: validatedClaims, denominator: validationObservations, status: validationObservations ? "observed" : "not_measured", capturesWithoutObservation: captures.length - validationObservations },
    researchQuality: { status: "not_measured", reason: "Operational captures do not establish factual correctness, citation support, completeness, freshness, or calibrated decision quality." },
  };
}

export function scoreBenchmark(benchmark) {
  const errors = [];
  if (!benchmark || typeof benchmark !== "object" || Array.isArray(benchmark)) return { complete: false, errors: ["Benchmark must be a JSON object."] };
  if (benchmark.schemaVersion !== 1) errors.push("schemaVersion must be 1.");
  if (!Array.isArray(benchmark.events)) errors.push("events must be an array.");
  if (Object.hasOwn(benchmark, "unmatched_run_captures") && !Array.isArray(benchmark.unmatched_run_captures)) errors.push("unmatched_run_captures must be an array when provided.");
  const events = Array.isArray(benchmark.events) ? benchmark.events : [];
  if (events.length < 10) errors.push(`At least 10 events are required; found ${events.length}.`);

  const categories = new Set();
  const eventIds = new Set();
  let factualClaims = 0;
  let citedClaims = 0;
  let quoteMatchedClaims = 0;
  let unsupportedClaims = 0;
  let counterEvidenceExpected = 0;
  let counterEvidenceCaptured = 0;
  let totalDomains = 0;
  let totalSourceClasses = 0;
  let diversityEvents = 0;
  const taskTimes = [];
  const sourceClassTotals = Object.fromEntries([...SOURCE_CLASSES].map((name) => [name, { sources: 0, factualClaims: 0, citedClaims: 0 }]));

  for (const [eventIndex, event] of events.entries()) {
    const label = `events[${eventIndex}]`;
    if (!event || typeof event !== "object" || Array.isArray(event)) { errors.push(`${label} must be an object.`); continue; }
    if (typeof event.id !== "string" || !event.id.trim()) errors.push(`${label}.id is required.`);
    else if (eventIds.has(event.id)) errors.push(`${label}.id is duplicated: ${event.id}.`);
    else eventIds.add(event.id);
    if (typeof event.category !== "string" || !event.category.trim()) errors.push(`${label}.category is required.`);
    else categories.add(event.category.trim());
    if (typeof event.question !== "string" || !event.question.trim()) errors.push(`${label}.question is required.`);
    if (event.askedAt !== null && (typeof event.askedAt !== "string" || Number.isNaN(Date.parse(event.askedAt)))) errors.push(`${label}.askedAt must be an ISO timestamp or null when not recorded.`);

    const sources = Array.isArray(event.sources) ? event.sources : [];
    if (!Array.isArray(event.sources) || !sources.length) errors.push(`${label}.sources must contain at least one captured source.`);
    const sourceUrls = new Set();
    const normalizedSources = [];
    for (const [sourceIndex, source] of sources.entries()) {
      const sourceLabel = `${label}.sources[${sourceIndex}]`;
      if (!source || typeof source !== "object") { errors.push(`${sourceLabel} must be an object.`); continue; }
      let url;
      try { url = new URL(source.url); } catch { errors.push(`${sourceLabel}.url must be a valid URL.`); continue; }
      if (!["http:", "https:"].includes(url.protocol)) errors.push(`${sourceLabel}.url must use HTTP or HTTPS.`);
      const canonicalUrl = url.href;
      if (sourceUrls.has(canonicalUrl)) errors.push(`${sourceLabel}.url duplicates another source in this event.`);
      sourceUrls.add(canonicalUrl);
      if (!SOURCE_CLASSES.has(source.sourceClass)) errors.push(`${sourceLabel}.sourceClass is invalid.`);
      if (typeof source.accessible !== "boolean") errors.push(`${sourceLabel}.accessible must be true or false.`);
      if (source.accessible && (typeof source.capturedText !== "string" || !source.capturedText.trim())) errors.push(`${sourceLabel}.capturedText is required when the source is accessible.`);
      if (source.publicationAt !== null && (typeof source.publicationAt !== "string" || Number.isNaN(Date.parse(source.publicationAt)))) errors.push(`${sourceLabel}.publicationAt must be a timestamp or null.`);
      if (typeof source.capturedAt !== "string" || Number.isNaN(Date.parse(source.capturedAt))) errors.push(`${sourceLabel}.capturedAt must be an ISO timestamp.`);
      normalizedSources.push({ ...source, url: canonicalUrl, domain: url.hostname.toLowerCase() });
      if (sourceClassTotals[source.sourceClass]) sourceClassTotals[source.sourceClass].sources += 1;
    }
    const domains = distinctSourceValues(normalizedSources, (source) => source.domain);
    const sourceClasses = distinctSourceValues(normalizedSources, (source) => SOURCE_CLASSES.has(source.sourceClass) ? source.sourceClass : null);
    totalDomains += domains.size;
    totalSourceClasses += sourceClasses.size;
    if (normalizedSources.length) diversityEvents += 1;

    const review = event.review;
    if (!review || typeof review !== "object" || typeof review.counterEvidenceInCapturedSources !== "boolean") {
      errors.push(`${label}.review.counterEvidenceInCapturedSources must be true or false after reviewer agreement.`);
    }
    const brief = event.brief;
    if (!brief || typeof brief !== "object" || typeof brief.counterEvidencePresent !== "boolean") {
      errors.push(`${label}.brief.counterEvidencePresent must be true or false.`);
    }
    if (review?.counterEvidenceInCapturedSources === true) {
      counterEvidenceExpected += 1;
      if (brief?.counterEvidencePresent === true) counterEvidenceCaptured += 1;
    }
    if (event.taskTimeSeconds !== null) {
      if (!Number.isFinite(event.taskTimeSeconds) || event.taskTimeSeconds <= 0) errors.push(`${label}.taskTimeSeconds must be a positive number or null when not measured.`);
      else taskTimes.push(event.taskTimeSeconds);
    }

    const claims = Array.isArray(event.claims) ? event.claims : [];
    if (!Array.isArray(event.claims)) errors.push(`${label}.claims must be an array.`);
    else if (!claims.length) errors.push(`${label}.claims must contain at least one reviewed claim.`);
    for (const [claimIndex, claim] of claims.entries()) {
      const claimLabel = `${label}.claims[${claimIndex}]`;
      if (!claim || typeof claim !== "object") { errors.push(`${claimLabel} must be an object.`); continue; }
      if (typeof claim.text !== "string" || !claim.text.trim()) errors.push(`${claimLabel}.text is required.`);
      if (!new Set(["factual", "analyst_inference"]).has(claim.kind)) errors.push(`${claimLabel}.kind must be factual or analyst_inference.`);
      const quote = typeof claim.quote === "string" ? claim.quote : "";
      if (!quote.trim()) errors.push(`${claimLabel}.quote is required.`);
      let canonicalClaimUrl = null;
      try { if (typeof claim.sourceUrl === "string") canonicalClaimUrl = new URL(claim.sourceUrl, "https://invalid.local").href; } catch { /* Report a schema error below; malformed input must not crash scoring. */ }
      if (!canonicalClaimUrl || !sourceUrls.has(canonicalClaimUrl)) errors.push(`${claimLabel}.sourceUrl must match one captured source URL.`);
      const reviewers = Array.isArray(claim.reviewers) ? claim.reviewers : [];
      const reviewerIds = new Set(reviewers.map((reviewer) => reviewer?.reviewerId).filter((id) => typeof id === "string"));
      if (reviewers.length < 2 || reviewerIds.size < 2) errors.push(`${claimLabel} needs independent labels from two reviewers.`);
      for (const reviewer of reviewers) {
        if (!QUOTE_MATCH.has(reviewer?.quoteMatch) || !ENTAILMENT.has(reviewer?.entailment) || !SOURCE_FIT.has(reviewer?.sourceFit) || !INTERPRETATION.has(reviewer?.interpretationBoundary)) {
          errors.push(`${claimLabel} contains an invalid reviewer label.`);
        }
      }
      const resolution = claim.resolution;
      if (!resolution || !QUOTE_MATCH.has(resolution.quoteMatch) || !ENTAILMENT.has(resolution.entailment) || !SOURCE_FIT.has(resolution.sourceFit) || !INTERPRETATION.has(resolution.interpretationBoundary)) {
        errors.push(`${claimLabel}.resolution must contain the adjudicated reviewer labels.`);
        continue;
      }
      if (claim.kind !== "factual") continue;
      factualClaims += 1;
      const source = canonicalClaimUrl ? normalizedSources.find((item) => canonicalClaimUrl === item.url) : null;
      const sourceClass = source?.sourceClass;
      const sourceStats = sourceClassTotals[sourceClass];
      if (sourceStats) sourceStats.factualClaims += 1;
      if (claim.sourceUrl && quote.trim() && source) {
        citedClaims += 1;
        if (sourceStats) sourceStats.citedClaims += 1;
      }
      if (resolution.quoteMatch === "exact" || resolution.quoteMatch === "substantially_exact") quoteMatchedClaims += 1;
      if (resolution.quoteMatch === "unsupported" || resolution.entailment === "not_established" || resolution.entailment === "contradicted") unsupportedClaims += 1;
    }
  }

  if (!factualClaims) errors.push("The evaluation set must contain at least one independently reviewed factual claim.");
  if (categories.size < 3) errors.push(`At least three event categories are required; found ${categories.size}.`);
  const unmatchedRunCaptures = Array.isArray(benchmark.unmatched_run_captures) ? benchmark.unmatched_run_captures : [];
  for (const [index, record] of unmatchedRunCaptures.entries()) {
    const label = `unmatched_run_captures[${index}]`;
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      errors.push(`${label} must be an object.`);
      continue;
    }
    validateRunCapture(record.run_capture, `${label}.run_capture`, errors, { required: true });
  }
  const { errors: captureErrors, ...operationalObservations } = scoreOperationalObservations(events, unmatchedRunCaptures);
  errors.push(...captureErrors);
  const complete = errors.length === 0;
  const mean = (sum, count) => count ? Math.round((sum / count) * 100) / 100 : null;
  const metrics = {
    eventCount: events.length,
    categoryCount: categories.size,
    citationCoverage: ratio(citedClaims, factualClaims),
    unsupportedClaimRate: ratio(unsupportedClaims, factualClaims),
    quoteFidelity: ratio(quoteMatchedClaims, factualClaims),
    counterEvidenceCoverage: ratio(counterEvidenceCaptured, counterEvidenceExpected),
    sourceDiversity: {
      eventsMeasured: diversityEvents,
      meanDistinctDomainsPerEvent: mean(totalDomains, diversityEvents),
      meanSourceClassesPerEvent: mean(totalSourceClasses, diversityEvents),
      interpretation: "Domain diversity is not evidence of editorial independence.",
    },
    taskTimeSeconds: taskTimes.length ? { count: taskTimes.length, median: median(taskTimes), minimum: Math.min(...taskTimes), maximum: Math.max(...taskTimes) } : { status: "not_measured", count: 0, median: null, minimum: null, maximum: null },
    sourceClasses: sourceClassTotals,
  };
  return { complete, errors, metadata: benchmark.metadata ?? {}, metrics: complete ? metrics : null, operationalObservations };
}

async function main() {
  const file = process.argv[2];
  if (!file || file === "--help") {
    console.error("Usage: node scripts/score-research-benchmark.mjs <benchmark.json>");
    process.exitCode = file === "--help" ? 0 : 2;
    return;
  }
  try {
    const benchmark = JSON.parse(await readFile(file, "utf8"));
    const report = scoreBenchmark(benchmark);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (!report.complete) process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Could not read benchmark JSON.");
    process.exitCode = 2;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
