import test from "node:test";
import assert from "node:assert/strict";
import { buildSignals, runBacktest, runCostSensitivity, runRandomEntryPlacebo, runWalkForward } from "../lib/backtest.ts";

const FOUR_HOURS = 4 * 60 * 60 * 1000;
const ONE_DAY = 24 * 60 * 60 * 1000;
const start = Date.UTC(2025, 0, 1);

function fixture(count = 1_000, interval = FOUR_HOURS, firstTimestamp = start) {
  const candles = [];
  let prior = 100;
  for (let i = 0; i < count; i += 1) {
    const close = 100 + i * 0.025 + 6 * Math.sin(i / 17) + 2 * Math.sin(i / 5);
    const open = prior;
    candles.push({
      timestamp: firstTimestamp + i * interval,
      open,
      high: Math.max(open, close) + 0.15,
      low: Math.min(open, close) - 0.15,
      close,
      volume: 1_000 + i,
      turnover: 100_000 + i,
    });
    prior = close;
  }
  return candles;
}

test("runs a chronological holdout over at least 60 days with costs and a trade ledger", () => {
  const candles = fixture();
  const result = runBacktest("RAAPLUSDT", "4H", candles);
  assert.equal(result.candleCount, 1_000);
  assert.ok(result.dataEnd - result.dataStart >= 60 * 24 * 60 * 60 * 1000);
  assert.ok(result.dataEnd - candles[result.splitIndex].timestamp >= 30 * 24 * 60 * 60 * 1000);
  assert.ok(result.test.candles >= 20);
  assert.ok(result.test.tradeLog.length > 0);
  assert.ok(result.test.tradeLog.every((trade) => Number.isFinite(trade.returnPct)));
  assert.ok(result.test.equityCurve.every((point) => Number.isFinite(point.equity) && point.equity > 0));
  assert.ok(result.validation.trainingDays >= 30);
  assert.ok(result.validation.holdoutDays >= 30);
  assert.equal(result.validation.holdoutExcessReturnPct, result.test.totalReturnPct - result.test.buyAndHoldReturnPct);
  assert.ok(["outperformed_benchmark", "matched_benchmark", "underperformed_benchmark", "insufficient_trades"].includes(result.validation.verdict));
});

test("uses current Bitget-sized 4H history while preserving 30-day training and holdout windows", () => {
  const candles = fixture(540);
  const result = runBacktest("RTSLAUSDT", "4H", candles);
  const day = 24 * 60 * 60 * 1000;
  assert.equal(result.parameters.trainFraction, 0.66);
  assert.ok(candles.at(-1).timestamp - candles[0].timestamp >= 60 * day);
  assert.ok(candles.at(-1).timestamp - candles[result.splitIndex].timestamp >= 30 * day);
  assert.ok(candles[result.splitIndex - 1].timestamp - candles[result.parameters.slowWindow].timestamp >= 30 * day);
});

test("rejects 90 daily candles when the SMA warm-up leaves too little evaluated training data", () => {
  assert.throws(() => runBacktest("RAAPLUSDT", "1D", fixture(90, ONE_DAY)), /training window is shorter than 30 days after the 50-candle warm-up/);
});

test("excludes the current unfinished candle from the run and its score", () => {
  const asOf = Date.UTC(2026, 9, 5, 13, 30);
  const currentBarStart = Math.floor(asOf / FOUR_HOURS) * FOUR_HOURS;
  const candles = fixture(540, FOUR_HOURS, currentBarStart - 539 * FOUR_HOURS);
  const changedForming = [...candles];
  changedForming[539] = { ...changedForming[539], open: 90, high: 240, low: 89, close: 230 };

  const result = runBacktest("RTSLAUSDT", "4H", candles, asOf);
  const changedResult = runBacktest("RTSLAUSDT", "4H", changedForming, asOf);
  assert.equal(result.candleCount, 539);
  assert.equal(result.dataEnd, currentBarStart - FOUR_HOURS);
  assert.deepEqual(changedResult, result);
});

test("produces the same result when provider candles arrive in reverse order", () => {
  const candles = fixture();
  assert.deepEqual(runBacktest("RAAPLUSDT", "4H", candles), runBacktest("RAAPLUSDT", "4H", [...candles].reverse()));
});

test("rejects malformed OHLC, negative volume, and duplicate timestamps", () => {
  const badOhlc = fixture();
  badOhlc[900] = { ...badOhlc[900], high: 1 };
  assert.throws(() => runBacktest("RAAPLUSDT", "4H", badOhlc), /inconsistent OHLC/);

  const badVolume = fixture();
  badVolume[900] = { ...badVolume[900], volume: -1 };
  assert.throws(() => runBacktest("RAAPLUSDT", "4H", badVolume), /invalid volume/);

  const duplicate = fixture();
  duplicate[900] = { ...duplicate[900], timestamp: duplicate[899].timestamp };
  assert.throws(() => runBacktest("RAAPLUSDT", "4H", duplicate), /duplicate timestamps/);
});

test("rejects data that cannot support the required overall and holdout windows", () => {
  assert.throws(() => runBacktest("RAAPLUSDT", "4H", fixture(79)), /At least 80/);
  assert.throws(() => runBacktest("RAAPLUSDT", "4H", fixture(400)), /holdout is shorter than 30 days/);
});

test("changing a future candle cannot rewrite trades that already exited", () => {
  const original = fixture();
  const changedAt = 850;
  const revised = [...original];
  revised[changedAt] = { ...revised[changedAt], open: 220, high: 230, low: 210, close: 225 };
  const before = runBacktest("RAAPLUSDT", "4H", original);
  const after = runBacktest("RAAPLUSDT", "4H", revised);
  const cutoff = original[changedAt].timestamp;
  assert.deepEqual(
    after.test.tradeLog.filter((trade) => trade.exitTime < cutoff),
    before.test.tradeLog.filter((trade) => trade.exitTime < cutoff),
  );
});

test("walk-forward windows are disjoint, chronological, and reproducible", () => {
  const candles = fixture(1_000);
  const result = runWalkForward("RAAPLUSDT", "4H", candles);
  assert.equal(result.totalFolds, 3);
  assert.equal(result.folds[0].testStart, candles.at(-1 - Math.floor((candles.length - 50) / 4) * 3 + 1).timestamp);
  assert.ok(result.folds[0].testEnd < result.folds[1].testStart);
  assert.ok(result.folds[1].testEnd < result.folds[2].testStart);
  assert.ok(result.folds.every((fold) => fold.metrics.candles >= 60));
  assert.deepEqual(result, runWalkForward("RAAPLUSDT", "4H", candles));
});

test("cost stress uses identical candles and shows increasing assumed friction", () => {
  const scenarios = runCostSensitivity("RAAPLUSDT", "4H", fixture());
  assert.deepEqual(scenarios.map(({ label }) => label), ["Base", "Elevated", "Stress"]);
  assert.ok(scenarios[0].feeBpsPerSide < scenarios[1].feeBpsPerSide);
  assert.ok(scenarios[1].slippageBpsPerSide < scenarios[2].slippageBpsPerSide);
  assert.ok(scenarios.every((item) => Number.isFinite(item.returnPct)));
  assert.ok(scenarios[2].returnPct <= scenarios[0].returnPct);
});

test("random long/cash placebo is reproducible and seeds only from the training window", () => {
  const candles = fixture(1_000);
  const result = runBacktest("RAAPLUSDT", "4H", candles);
  const placebo = runRandomEntryPlacebo(candles, "4H", Date.now(), result.strategyKey, result.test.totalReturnPct);
  const repeated = runRandomEntryPlacebo(candles, "4H", Date.now(), result.strategyKey, result.test.totalReturnPct);
  assert.deepEqual(placebo, repeated);
  assert.equal(placebo.version, 2);
  assert.equal(placebo.simulations, 100);
  assert.equal(runRandomEntryPlacebo(candles, "4H", Date.now(), result.strategyKey, result.test.totalReturnPct, Number.NaN).simulations, 100);
  assert.ok(placebo.p05ReturnPct <= placebo.medianReturnPct);
  assert.ok(placebo.medianReturnPct <= placebo.p95ReturnPct);
  assert.ok(placebo.beatsStrategyPct >= 0 && placebo.beatsStrategyPct <= 100);

  const changedHoldout = [...candles];
  changedHoldout[900] = { ...changedHoldout[900], open: 220, high: 230, low: 210, close: 225 };
  const changed = runRandomEntryPlacebo(changedHoldout, "4H", Date.now(), result.strategyKey, result.test.totalReturnPct);
  assert.equal(changed.seed, placebo.seed, "holdout prices cannot influence placebo randomization");
  assert.equal(changed.trainingEntryRatePerBar, placebo.trainingEntryRatePerBar);
  assert.equal(changed.trainingExitRatePerBar, placebo.trainingExitRatePerBar);
});

test("random placebo uses state-conditional training hazards and can enter at the first holdout open", () => {
  const interval = FOUR_HOURS;
  const candles = [];
  let priorClose = 100;
  for (let i = 0; i < 1_000; i += 1) {
    const close = i < 660 ? 100 + i * 0.1 : 100 + 659 * 0.1;
    const open = priorClose;
    candles.push({ timestamp: start + i * interval, open, high: Math.max(open, close) + 0.1, low: Math.min(open, close) - 0.1, close, volume: 1_000, turnover: 100_000 });
    priorClose = close;
  }
  const splitIndex = Math.floor(candles.length * 0.66);
  const firstHoldout = candles[splitIndex];
  const surge = firstHoldout.open * 1.4;
  candles[splitIndex] = { ...firstHoldout, high: surge + 0.1, close: surge };
  for (let i = splitIndex + 1; i < candles.length; i += 1) candles[i] = { ...candles[i], open: surge, high: surge + 0.1, low: surge - 0.1, close: surge };

  const placebo = runRandomEntryPlacebo(candles, "4H", Date.now(), "sma_trend_v1", 39, 500);
  assert.equal(placebo.trainingEntryRatePerBar, 1, "the sole observed cash-state transition is one entry per eligible cash bar");
  assert.equal(placebo.trainingExitRatePerBar, 0, "no exit from the long state was observed in training");
  assert.ok(placebo.p05ReturnPct > 30, "training-only initialization permits placebo exposure at the first holdout open");
});

test("trend pullback and semiconductor breakout are deterministic, boolean, causal rules", () => {
  const candles = fixture();
  for (const strategy of ["trend_pullback_v1", "semi_breakout_v1"]) {
    const signals = buildSignals(candles, strategy);
    assert.equal(signals.length, candles.length);
    assert.ok(signals.every((signal) => typeof signal === "boolean"));
    assert.deepEqual(signals, buildSignals(candles, strategy));

    const changed = [...candles];
    const changedAt = 800;
    changed[changedAt] = { ...changed[changedAt], open: 125, high: 150, low: 120, close: 149, volume: 1_000_000 };
    assert.deepEqual(buildSignals(changed, strategy).slice(0, changedAt), signals.slice(0, changedAt));
  }
});

test("the volume-confirmed semiconductor rule stays flat when volume is unavailable", () => {
  const candles = fixture().map((candle) => ({ ...candle, volume: null }));
  assert.ok(buildSignals(candles, "semi_breakout_v1").every((signal) => signal === false));
});
