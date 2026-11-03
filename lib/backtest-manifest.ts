import { createHash } from "node:crypto";
import type { AlphaMarketCategory, CandleInterval, MarketCandle } from "@/lib/bitget-market";

export const BACKTEST_ENGINE_VERSION = "alpha-backtest-v1" as const;

export type BacktestExperimentManifest = {
  schemaVersion: 1;
  engine: { name: "tidelight-alpha-backtest"; version: typeof BACKTEST_ENGINE_VERSION; sourceRevision: string | null };
  strategy: { key: string; version: string };
  instrument: { symbol: string; marketCategory: AlphaMarketCategory; interval: CandleInterval; assetName: string; assetKind: string };
  dataset: {
    provider: "Bitget";
    fingerprint: { algorithm: "SHA-256"; encoding: "ohlcv-v1"; value: string };
    rowCount: number;
    firstTimestamp: number;
    lastTimestamp: number;
    capturedAt: number;
    providerTimestamp: number | null;
  };
  split: { trainStart: number; trainEnd: number; holdoutStart: number; holdoutEnd: number; splitIndex: number };
  execution: {
    initialEquity: number;
    feeBpsPerSide: number;
    slippageBpsPerSide: number;
    positionModel: "long_cash";
    leverage: 1;
    funding: "excluded" | "not_applicable";
  };
  integrity: { algorithm: "SHA-256"; manifestDigest: string };
};

type ManifestInput = {
  symbol: string;
  marketCategory: AlphaMarketCategory;
  interval: CandleInterval;
  assetName: string;
  assetKind: string;
  strategyKey: string;
  candles: MarketCandle[];
  splitIndex: number;
  trainStart: number;
  capturedAt: number;
  providerTimestamp: number | null;
  feeBpsPerSide: number;
  slippageBpsPerSide: number;
  initialEquity: number;
  sourceRevision: string | null;
};

/** Convert candles into the stable OHLCV field order used by dataset fingerprints. */
function canonicalRows(candles: MarketCandle[]) {
  return candles.map((candle) => [
    candle.timestamp,
    candle.open,
    candle.high,
    candle.low,
    candle.close,
    candle.volume ?? null,
    candle.turnover ?? null,
  ]);
}

/** Serialize plain JSON values with sorted object keys for reproducible digests. */
function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/** Return the SHA-256 fingerprint for an ordered set of archived OHLCV candles. */
export function fingerprintBacktestCandles(candles: MarketCandle[]) {
  return createHash("sha256").update(JSON.stringify(canonicalRows(candles))).digest("hex");
}

/** Hash the manifest fields that precede its integrity record. */
function digestManifest(manifest: Omit<BacktestExperimentManifest, "integrity">) {
  return createHash("sha256").update(stableJson(manifest)).digest("hex");
}

/** Capture the strategy, market, holdout split, costs, and dataset provenance for one run. */
export function createBacktestExperimentManifest(input: ManifestInput): BacktestExperimentManifest {
  if (input.candles.length < 2 || input.splitIndex < 1 || input.splitIndex >= input.candles.length) throw new Error("The experiment manifest needs a valid training and holdout split.");
  if (!Number.isSafeInteger(input.capturedAt) || input.capturedAt <= 0) throw new Error("The experiment capture time is invalid.");
  const ordered = input.candles;
  const first = ordered[0];
  const last = ordered.at(-1)!;
  const trainEnd = ordered[input.splitIndex - 1];
  const holdoutStart = ordered[input.splitIndex];
  const sourceRevision = typeof input.sourceRevision === "string" && /^[0-9a-f]{7,64}$/i.test(input.sourceRevision) ? input.sourceRevision : null;
  if (!Number.isSafeInteger(input.trainStart) || !ordered.slice(0, input.splitIndex).some(candle => candle.timestamp === input.trainStart)) throw new Error("The experiment manifest training start must be a training candle within the archive.");
  const manifest = {
    schemaVersion: 1 as const,
    engine: { name: "tidelight-alpha-backtest" as const, version: BACKTEST_ENGINE_VERSION, sourceRevision },
    strategy: { key: input.strategyKey, version: input.strategyKey },
    instrument: { symbol: input.symbol, marketCategory: input.marketCategory, interval: input.interval, assetName: input.assetName.slice(0, 160), assetKind: input.assetKind.slice(0, 48) },
    dataset: {
      provider: "Bitget" as const,
      fingerprint: { algorithm: "SHA-256" as const, encoding: "ohlcv-v1" as const, value: fingerprintBacktestCandles(ordered) },
      rowCount: ordered.length,
      firstTimestamp: first.timestamp,
      lastTimestamp: last.timestamp,
      capturedAt: input.capturedAt,
      providerTimestamp: Number.isSafeInteger(input.providerTimestamp) && input.providerTimestamp! > 0 ? input.providerTimestamp : null,
    },
    split: { trainStart: input.trainStart, trainEnd: trainEnd.timestamp, holdoutStart: holdoutStart.timestamp, holdoutEnd: last.timestamp, splitIndex: input.splitIndex },
    execution: {
      initialEquity: input.initialEquity,
      feeBpsPerSide: input.feeBpsPerSide,
      slippageBpsPerSide: input.slippageBpsPerSide,
      positionModel: "long_cash" as const,
      leverage: 1 as const,
      funding: input.marketCategory === "USDT-FUTURES" ? "excluded" as const : "not_applicable" as const,
    },
  };
  return { ...manifest, integrity: { algorithm: "SHA-256", manifestDigest: digestManifest(manifest) } };
}

/** Verify candle validity, dataset identity, manifest assumptions, and digest before replay publication. */
export function verifyBacktestExperimentManifest(value: unknown, candles: MarketCandle[]): value is BacktestExperimentManifest {
  if (!value || typeof value !== "object" || Array.isArray(value) || candles.length < 2 || candles.length > 1000) return false;
  for (let index = 0; index < candles.length; index += 1) {
    const candle = candles[index];
    if (!candle || !Number.isSafeInteger(candle.timestamp) || candle.timestamp <= 0 || [candle.open, candle.high, candle.low, candle.close].some(price => !Number.isFinite(price) || price <= 0)) return false;
    if (candle.high < Math.max(candle.open, candle.close, candle.low) || candle.low > Math.min(candle.open, candle.close, candle.high)) return false;
    if ((candle.volume !== null && (!Number.isFinite(candle.volume) || candle.volume < 0)) || (candle.turnover !== null && (!Number.isFinite(candle.turnover) || candle.turnover < 0))) return false;
    if (index > 0 && candle.timestamp <= candles[index - 1].timestamp) return false;
  }
  const manifest = value as Partial<BacktestExperimentManifest>;
  if (manifest.schemaVersion !== 1 || manifest.engine?.name !== "tidelight-alpha-backtest" || !/^alpha-backtest-v\d+$/.test(manifest.engine.version) || manifest.dataset?.rowCount !== candles.length || manifest.dataset.provider !== "Bitget") return false;
  if (manifest.engine.sourceRevision !== null && (typeof manifest.engine.sourceRevision !== "string" || !/^[0-9a-f]{7,64}$/i.test(manifest.engine.sourceRevision))) return false;
  if (manifest.dataset.fingerprint?.encoding !== "ohlcv-v1" || manifest.dataset.fingerprint.algorithm !== "SHA-256") return false;
  if (!manifest.strategy || typeof manifest.strategy.key !== "string" || manifest.strategy.version !== manifest.strategy.key) return false;
  if (!manifest.instrument || typeof manifest.instrument.symbol !== "string" || !["SPOT", "USDT-FUTURES"].includes(manifest.instrument.marketCategory) || !["1H", "4H", "1D"].includes(manifest.instrument.interval) || typeof manifest.instrument.assetName !== "string" || typeof manifest.instrument.assetKind !== "string") return false;
  if (!manifest.dataset || !Number.isSafeInteger(manifest.dataset.capturedAt) || manifest.dataset.capturedAt! <= 0) return false;
  if (manifest.dataset.providerTimestamp !== null && (!Number.isSafeInteger(manifest.dataset.providerTimestamp) || manifest.dataset.providerTimestamp! <= 0)) return false;
  if (manifest.dataset.firstTimestamp !== candles[0].timestamp || manifest.dataset.lastTimestamp !== candles.at(-1)?.timestamp) return false;
  if (!manifest.split || !Number.isSafeInteger(manifest.split.splitIndex) || manifest.split.splitIndex < 1 || manifest.split.splitIndex >= candles.length) return false;
  const split = manifest.split;
  if (!candles.slice(0, split.splitIndex).some(candle => candle.timestamp === split.trainStart) || split.trainEnd !== candles[split.splitIndex - 1].timestamp || split.holdoutStart !== candles[split.splitIndex].timestamp || split.holdoutEnd !== candles.at(-1)?.timestamp) return false;
  if (!manifest.execution || ![manifest.execution.initialEquity, manifest.execution.feeBpsPerSide, manifest.execution.slippageBpsPerSide].every(Number.isFinite) || manifest.execution.initialEquity <= 0 || manifest.execution.feeBpsPerSide < 0 || manifest.execution.slippageBpsPerSide < 0 || manifest.execution.positionModel !== "long_cash" || manifest.execution.leverage !== 1) return false;
  if (manifest.execution.funding !== (manifest.instrument.marketCategory === "USDT-FUTURES" ? "excluded" : "not_applicable")) return false;
  try {
    if (manifest.dataset.fingerprint.value !== fingerprintBacktestCandles(candles)) return false;
  } catch { return false; }
  if (!manifest.integrity || manifest.integrity.algorithm !== "SHA-256" || !/^[0-9a-f]{64}$/i.test(manifest.integrity.manifestDigest)) return false;
  const { integrity, ...core } = manifest;
  try { return digestManifest(core as Omit<BacktestExperimentManifest, "integrity">) === integrity.manifestDigest; }
  catch { return false; }
}
