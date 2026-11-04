import test from "node:test";
import assert from "node:assert/strict";
import { summarizeCapsuleOutcomes } from "../lib/decision-capsule-outcomes.ts";

function forecast(id, probability) {
  return { id, type: "forecast", payload: { probability } };
}
function outcome(id, forecastEventId, forecastMet) {
  return { id, type: "outcome", payload: { forecastEventId, forecastMet } };
}

test("reports descriptive outcome rate and Brier score without claiming calibration on small samples", () => {
  const events = [
    forecast("f1", 0.8), forecast("f2", 0.2), forecast("f3", undefined),
    outcome("o1", "f1", true), outcome("o2", "f2", false), outcome("o3", "f3", true),
  ];
  const summary = summarizeCapsuleOutcomes(events);
  assert.deepEqual({ ...summary, meanBrierScore: Number(summary.meanBrierScore?.toFixed(6)) }, {
    forecastCount: 3,
    outcomeCount: 3,
    thresholdHits: 2,
    thresholdHitRate: 2 / 3,
    scoredCount: 2,
    meanBrierScore: 0.04,
    calibrationGap: null,
  });
});

test("estimates an exploratory reliability gap only after twenty scored observations", () => {
  const events = [];
  for (let i = 0; i < 10; i++) {
    events.push(forecast(`high-${i}`, 0.8), outcome(`high-outcome-${i}`, `high-${i}`, i < 7));
    events.push(forecast(`low-${i}`, 0.2), outcome(`low-outcome-${i}`, `low-${i}`, i < 2));
  }
  const summary = summarizeCapsuleOutcomes(events);
  assert.equal(summary.scoredCount, 20);
  assert.equal(summary.calibrationGap, 0.05);
  assert.equal(summary.forecastCount, 20);
  assert.equal(summary.outcomeCount, 20);
});

test("does not score outcomes that cannot resolve to a forecast", () => {
  const summary = summarizeCapsuleOutcomes([outcome("o1", "missing", true)]);
  assert.equal(summary.outcomeCount, 0);
  assert.equal(summary.thresholdHits, 0);
  assert.equal(summary.thresholdHitRate, null);
  assert.equal(summary.scoredCount, 0);
  assert.equal(summary.meanBrierScore, null);
});
