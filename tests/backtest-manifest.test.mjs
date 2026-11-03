import test from "node:test";
import assert from "node:assert/strict";
import { createBacktestExperimentManifest, fingerprintBacktestCandles, verifyBacktestExperimentManifest } from "../lib/backtest-manifest.ts";

const candles = [
  { timestamp: 1_800_000_000_000, open: 100, high: 102, low: 99, close: 101, volume: 20, turnover: 2020 },
  { timestamp: 1_800_014_400_000, open: 101, high: 103, low: 100, close: 102, volume: 22, turnover: 2244 },
  { timestamp: 1_800_028_800_000, open: 102, high: 104, low: 101, close: 103, volume: null, turnover: null },
];
const input = {
  symbol: "NVDAUSDT", marketCategory: "USDT-FUTURES", interval: "4H", assetName: "NVIDIA", assetKind: "stock-perpetual",
  strategyKey: "sma_trend_v1", candles, splitIndex: 2, trainStart: candles[1].timestamp, capturedAt: 1_800_030_000_000, providerTimestamp: 1_800_029_000_000,
  feeBpsPerSide: 10, slippageBpsPerSide: 5, initialEquity: 10_000, sourceRevision: "c".repeat(40),
};

test("manifest captures the exact engine, strategy, market, dataset, split and cost assumptions", () => {
  const manifest = createBacktestExperimentManifest(input);
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.engine.version, "alpha-backtest-v1");
  assert.equal(manifest.engine.sourceRevision, input.sourceRevision);
  assert.deepEqual(manifest.strategy, { key: "sma_trend_v1", version: "sma_trend_v1" });
  assert.deepEqual(manifest.instrument, { symbol: "NVDAUSDT", marketCategory: "USDT-FUTURES", interval: "4H", assetName: "NVIDIA", assetKind: "stock-perpetual" });
  assert.equal(manifest.dataset.provider, "Bitget");
  assert.equal(manifest.dataset.rowCount, candles.length);
  assert.deepEqual(manifest.split, { trainStart: candles[1].timestamp, trainEnd: candles[1].timestamp, holdoutStart: candles[2].timestamp, holdoutEnd: candles[2].timestamp, splitIndex: 2 });
  assert.equal(manifest.dataset.firstTimestamp, candles[0].timestamp, "the full archived dataset boundary remains distinct from evaluated training start");
  assert.deepEqual(manifest.execution, { initialEquity: 10_000, feeBpsPerSide: 10, slippageBpsPerSide: 5, positionModel: "long_cash", leverage: 1, funding: "excluded" });
  assert.match(manifest.integrity.manifestDigest, /^[0-9a-f]{64}$/);
  assert.equal(verifyBacktestExperimentManifest(manifest, candles), true);
});

test("training start must be an archived candle inside the pre-holdout training split", () => {
  assert.throws(() => createBacktestExperimentManifest({ ...input, trainStart: candles[2].timestamp }), /training candle within the archive/);
  const manifest = createBacktestExperimentManifest(input);
  assert.equal(verifyBacktestExperimentManifest({ ...manifest, split: { ...manifest.split, trainStart: candles[0].timestamp }, integrity: manifest.integrity }, candles), false, "the signed training start cannot be moved without recomputing a matching digest");
});

test("fingerprints are stable to object-key order and change when an OHLCV value changes", () => {
  const reordered = candles.map(candle => ({ close: candle.close, timestamp: candle.timestamp, turnover: candle.turnover, low: candle.low, open: candle.open, volume: candle.volume, high: candle.high }));
  assert.equal(fingerprintBacktestCandles(candles), fingerprintBacktestCandles(reordered));
  assert.notEqual(fingerprintBacktestCandles(candles), fingerprintBacktestCandles(candles.map((candle, index) => index === 0 ? { ...candle, close: candle.close + 0.01 } : candle)));
});

test("archive or manifest edits fail integrity verification", () => {
  const manifest = createBacktestExperimentManifest(input);
  const reordered = (value) => Array.isArray(value) ? value.map(reordered) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).reverse().map(([key, item]) => [key, reordered(item)])) : value;
  assert.equal(verifyBacktestExperimentManifest(reordered(manifest), candles), true, "JSONB object-key ordering cannot invalidate the digest");
  assert.equal(verifyBacktestExperimentManifest(manifest, candles.slice(0, 2)), false);
  const changed = { ...manifest, execution: { ...manifest.execution, feeBpsPerSide: 0 } };
  assert.equal(verifyBacktestExperimentManifest(changed, candles), false);
  assert.equal(verifyBacktestExperimentManifest({ ...manifest, dataset: { ...manifest.dataset, fingerprint: { ...manifest.dataset.fingerprint, value: "f".repeat(64) } } }, candles), false);
});

test("invalid archived candle structure fails verification even when its fingerprint is recomputed", () => {
  const malformed = [
    candles.map((candle, index) => index === 0 ? { ...candle, high: 99 } : candle),
    candles.map((candle, index) => index === 0 ? { ...candle, close: Number.NaN } : candle),
    candles.map((candle, index) => index === 0 ? { ...candle, volume: -1 } : candle),
    candles.map((candle, index) => index === 1 ? { ...candle, timestamp: candles[0].timestamp } : candle),
  ];
  for (const archived of malformed) {
    const manifest = createBacktestExperimentManifest({ ...input, candles: archived, trainStart: archived[0].timestamp });
    assert.equal(verifyBacktestExperimentManifest(manifest, archived), false);
  }
});

test("spot assumptions do not inherit stock perpetual funding or leverage", () => {
  const spot = createBacktestExperimentManifest({ ...input, marketCategory: "SPOT", assetKind: "rtoken" });
  assert.deepEqual(spot.execution, { initialEquity: 10_000, feeBpsPerSide: 10, slippageBpsPerSide: 5, positionModel: "long_cash", leverage: 1, funding: "not_applicable" });
});
