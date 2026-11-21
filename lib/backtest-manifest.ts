import { createHash } from "node:crypto";
import type { AlphaMarketCategory, CandleInterval, MarketAsset, MarketCandle } from "@/lib/bitget-market";

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

export type BacktestMarketObservation = {
  capturedAt: number;
  quoteCurrency: string | null;
  instrumentStatus: string | null;
  providerTimestamp: number | null;
  receivedAt: number | null;
  candleProviderTimestamp: number | null;
  interval: CandleInterval;
  timestampTimezone: "UTC";
  candleFinality: "closed_by_interval_at_capture";
  marketSessionStatus: "available" | "unavailable";
  tradingSessions: string[];
  weekendTradable: boolean | null;
  marketSession: BacktestMarketSession | null;
};

type BacktestMarketSession = {
  market: string;
  daylightType: string | null;
  schedule: Array<{ state: string; timeZone: string; startTime: string; endTime: string }>;
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

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export function fingerprintBacktestCandles(candles: MarketCandle[]) {
  return createHash("sha256").update(JSON.stringify(canonicalRows(candles))).digest("hex");
}

export function createBacktestMarketObservation(input: { asset: MarketAsset; candles: MarketCandle[]; interval: CandleInterval; capturedAt: number }) {
  const asset = input.asset;
  const intervalDuration = input.interval === "15m" ? 15 * 60_000 : input.interval === "1H" ? 60 * 60_000 : input.interval === "4H" ? 4 * 60 * 60_000 : 24 * 60 * 60_000;
  if (!Number.isSafeInteger(input.capturedAt) || input.capturedAt <= 0 || input.candles.some(candle => !Number.isSafeInteger(candle.timestamp) || candle.timestamp + intervalDuration > input.capturedAt)) throw new Error("The market observation can include only candles closed by its capture time.");
  const candleProviderTimestamp = input.candles.length > 0
    && input.candles.every(candle => Number.isSafeInteger(candle.providerTimestamp) && (candle.providerTimestamp ?? 0) > 0 && candle.providerTimestamp === input.candles[0].providerTimestamp)
    ? input.candles[0].providerTimestamp!
    : null;
  const marketSession = asset.marketSession ? {
    market: asset.marketSession.market.slice(0, 24),
    daylightType: typeof asset.marketSession.daylightType === "string" ? asset.marketSession.daylightType.slice(0, 24) : null,
    schedule: asset.marketSession.schedule.slice(0, 16).map(item => ({ state: item.state.slice(0, 40), timeZone: item.timeZone.slice(0, 48), startTime: item.startTime.slice(0, 24), endTime: item.endTime.slice(0, 24) })),
  } : null;
  const observation: BacktestMarketObservation = {
    capturedAt: input.capturedAt,
    quoteCurrency: typeof asset.quoteCoin === "string" ? asset.quoteCoin.slice(0, 16) : null,
    instrumentStatus: typeof asset.instrumentStatus === "string" ? asset.instrumentStatus.slice(0, 40) : null,
    providerTimestamp: Number.isSafeInteger(asset.providerTimestamp) && (asset.providerTimestamp ?? 0) > 0 ? asset.providerTimestamp! : null,
    receivedAt: Number.isSafeInteger(asset.receivedAt) && (asset.receivedAt ?? 0) > 0 ? asset.receivedAt! : null,
    candleProviderTimestamp,
    interval: input.interval,
    timestampTimezone: "UTC",
    candleFinality: "closed_by_interval_at_capture",
    marketSessionStatus: asset.marketSessionStatus === "available" ? "available" : "unavailable",
    tradingSessions: asset.tradingSessions.filter(value => typeof value === "string").slice(0, 16).map(value => value.slice(0, 48)),
    weekendTradable: typeof asset.weekendTradable === "boolean" ? asset.weekendTradable : null,
    marketSession,
  };
  return { observation, digest: createHash("sha256").update(stableJson(observation)).digest("hex") };
}

export function verifyBacktestMarketObservation(value: unknown, digest: unknown, candles?: MarketCandle[]): value is BacktestMarketObservation {
  const observation = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  if (!observation || typeof digest !== "string" || !/^[0-9a-f]{64}$/i.test(digest)) return false;
  const hasOnlyKeys = (record: Record<string, unknown>, keys: string[]) => Object.keys(record).length === keys.length && Object.keys(record).every(key => keys.includes(key));
  if (!hasOnlyKeys(observation, ["capturedAt", "quoteCurrency", "instrumentStatus", "providerTimestamp", "receivedAt", "candleProviderTimestamp", "interval", "timestampTimezone", "candleFinality", "marketSessionStatus", "tradingSessions", "weekendTradable", "marketSession"])) return false;
  const positiveTimestamp = (timestamp: unknown) => timestamp === null || (Number.isSafeInteger(timestamp) && (timestamp as number) > 0);
  if (!Number.isSafeInteger(observation.capturedAt) || (observation.capturedAt as number) <= 0
    || !["UTC"].includes(String(observation.timestampTimezone))
    || !["15m", "1H", "4H", "1D"].includes(String(observation.interval))
    || observation.candleFinality !== "closed_by_interval_at_capture"
    || !["available", "unavailable"].includes(String(observation.marketSessionStatus))
    || !positiveTimestamp(observation.providerTimestamp)
    || !positiveTimestamp(observation.receivedAt)
    || !positiveTimestamp(observation.candleProviderTimestamp)
    || (observation.quoteCurrency !== null && (typeof observation.quoteCurrency !== "string" || observation.quoteCurrency.length > 16))
    || (observation.instrumentStatus !== null && (typeof observation.instrumentStatus !== "string" || observation.instrumentStatus.length > 40))
    || !Array.isArray(observation.tradingSessions) || observation.tradingSessions.length > 16 || observation.tradingSessions.some(value => typeof value !== "string" || value.length > 48)
    || (observation.weekendTradable !== null && typeof observation.weekendTradable !== "boolean")) return false;
  const session = observation.marketSession;
  if (session !== null && (!session || typeof session !== "object" || Array.isArray(session))) return false;
  if (session) {
    const market = session as Record<string, unknown>;
    if (!hasOnlyKeys(market, ["market", "daylightType", "schedule"]) || typeof market.market !== "string" || market.market.length > 24 || (market.daylightType !== null && (typeof market.daylightType !== "string" || market.daylightType.length > 24))
      || !Array.isArray(market.schedule) || market.schedule.length > 16 || market.schedule.some(item => !item || typeof item !== "object" || Array.isArray(item) || Object.values(item as Record<string, unknown>).some(field => typeof field !== "string") || Object.entries(item as Record<string, string>).some(([key, field]) => !["state", "timeZone", "startTime", "endTime"].includes(key) || field.length > ({ state: 40, timeZone: 48, startTime: 24, endTime: 24 }[key as "state" | "timeZone" | "startTime" | "endTime"] ?? 0)) || !["state", "timeZone", "startTime", "endTime"].every(key => typeof (item as Record<string, unknown>)[key] === "string"))) return false;
  }
  if (candles) {
    const duration = observation.interval === "15m" ? 15 * 60_000 : observation.interval === "1H" ? 60 * 60_000 : observation.interval === "4H" ? 4 * 60 * 60_000 : 24 * 60 * 60_000;
    if (candles.some(candle => !Number.isSafeInteger(candle.timestamp) || candle.timestamp + duration > (observation.capturedAt as number))) return false;
    const timestamps = candles.map(candle => candle.providerTimestamp);
    const first = timestamps[0];
    const commonTimestamp = timestamps.length > 0 && Number.isSafeInteger(first) && (first ?? 0) > 0 && timestamps.every(timestamp => timestamp === first) ? first : null;
    if (commonTimestamp !== observation.candleProviderTimestamp) return false;
  }
  try { return createHash("sha256").update(stableJson(observation)).digest("hex") === digest; }
  catch { return false; }
}

function digestManifest(manifest: Omit<BacktestExperimentManifest, "integrity">) {
  return createHash("sha256").update(stableJson(manifest)).digest("hex");
}

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
  if (manifest.schemaVersion !== 1 || manifest.engine?.name !== "tidelight-alpha-backtest" || !/^alpha-backtest-v\d+$/.test(manifest.engine.version) || !manifest.dataset || manifest.dataset.rowCount !== candles.length || manifest.dataset.provider !== "Bitget") return false;
  if (manifest.engine.sourceRevision !== null && (typeof manifest.engine.sourceRevision !== "string" || !/^[0-9a-f]{7,64}$/i.test(manifest.engine.sourceRevision))) return false;
  const dataset = manifest.dataset;
  if (dataset.fingerprint?.encoding !== "ohlcv-v1" || dataset.fingerprint.algorithm !== "SHA-256") return false;
  if (!manifest.strategy || typeof manifest.strategy.key !== "string" || manifest.strategy.version !== manifest.strategy.key) return false;
  if (!manifest.instrument || typeof manifest.instrument.symbol !== "string" || !["SPOT", "USDT-FUTURES"].includes(manifest.instrument.marketCategory) || !["1H", "4H", "1D"].includes(manifest.instrument.interval) || typeof manifest.instrument.assetName !== "string" || typeof manifest.instrument.assetKind !== "string") return false;
  if (!Number.isSafeInteger(dataset.capturedAt) || dataset.capturedAt <= 0) return false;
  if (dataset.providerTimestamp !== null && (!Number.isSafeInteger(dataset.providerTimestamp) || dataset.providerTimestamp <= 0)) return false;
  if (dataset.firstTimestamp !== candles[0].timestamp || dataset.lastTimestamp !== candles.at(-1)?.timestamp) return false;
  if (!manifest.split || !Number.isSafeInteger(manifest.split.splitIndex) || manifest.split.splitIndex < 1 || manifest.split.splitIndex >= candles.length) return false;
  const split = manifest.split;
  if (!candles.slice(0, split.splitIndex).some(candle => candle.timestamp === split.trainStart) || split.trainEnd !== candles[split.splitIndex - 1].timestamp || split.holdoutStart !== candles[split.splitIndex].timestamp || split.holdoutEnd !== candles.at(-1)?.timestamp) return false;
  if (!manifest.execution || ![manifest.execution.initialEquity, manifest.execution.feeBpsPerSide, manifest.execution.slippageBpsPerSide].every(Number.isFinite) || manifest.execution.initialEquity <= 0 || manifest.execution.feeBpsPerSide < 0 || manifest.execution.slippageBpsPerSide < 0 || manifest.execution.positionModel !== "long_cash" || manifest.execution.leverage !== 1) return false;
  if (manifest.execution.funding !== (manifest.instrument.marketCategory === "USDT-FUTURES" ? "excluded" : "not_applicable")) return false;
  try {
    if (dataset.fingerprint.value !== fingerprintBacktestCandles(candles)) return false;
  } catch { return false; }
  if (!manifest.integrity || manifest.integrity.algorithm !== "SHA-256" || !/^[0-9a-f]{64}$/i.test(manifest.integrity.manifestDigest)) return false;
  const { integrity, ...core } = manifest;
  try { return digestManifest(core as Omit<BacktestExperimentManifest, "integrity">) === integrity.manifestDigest; }
  catch { return false; }
}

export function backtestManifestMatchesRun(
  row: Record<string, unknown>,
  parameters: Record<string, unknown>,
  manifest: BacktestExperimentManifest,
): boolean {
  const firstTimestamp = typeof row.data_start === "string" ? Date.parse(row.data_start) : Number.NaN;
  const lastTimestamp = typeof row.data_end === "string" ? Date.parse(row.data_end) : Number.NaN;
  return manifest.instrument.symbol === row.symbol
    && manifest.instrument.interval === row.interval
    && manifest.strategy.key === row.strategy_key
    && manifest.instrument.marketCategory === parameters.marketCategory
    && manifest.instrument.assetName === parameters.assetName
    && manifest.instrument.assetKind === parameters.assetKind
    && manifest.execution.initialEquity === parameters.initialEquity
    && manifest.execution.feeBpsPerSide === parameters.feeBpsPerSide
    && manifest.execution.slippageBpsPerSide === parameters.slippageBpsPerSide
    && manifest.dataset.rowCount === row.candle_count
    && manifest.dataset.firstTimestamp === firstTimestamp
    && manifest.dataset.lastTimestamp === lastTimestamp;
}
