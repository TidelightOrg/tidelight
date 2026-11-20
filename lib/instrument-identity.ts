export const INSTRUMENT_SYMBOL_PATTERNS = {
  us_equity: /^[A-Z][A-Z0-9.-]{0,14}$/,
  reality_token: /^R[A-Z0-9.-]{1,15}$/,
  us_stock_perpetual: /^[A-Z0-9]{1,16}USDT$/,
} as const;

export type CanonicalInstrumentKind = keyof typeof INSTRUMENT_SYMBOL_PATTERNS;
export const CANONICAL_INSTRUMENT_KINDS = ["us_equity", "reality_token", "us_stock_perpetual"] as const satisfies readonly CanonicalInstrumentKind[];
export type CanonicalIssuerId = `sec-cik:${string}`;

export function canonicalIssuerIdFromSecCik(value: string | number): CanonicalIssuerId | null {
  const raw = String(value).trim();
  if (!/^\d{1,10}$/.test(raw) || Number(raw) <= 0) return null;
  return `sec-cik:${raw.padStart(10, "0")}`;
}

export const LEGACY_INSTRUMENT_KINDS = {
  reality_tokenized_spot: "reality_token",
  tokenized_equity_spot: "reality_token",
  rtoken: "reality_token",
  "stock-perpetual": "us_stock_perpetual",
  stock_perpetual: "us_stock_perpetual",
} as const satisfies Record<string, CanonicalInstrumentKind>;

export type LegacyInstrumentKind = keyof typeof LEGACY_INSTRUMENT_KINDS;

export type InstrumentLeg<K extends CanonicalInstrumentKind = CanonicalInstrumentKind> = {
  kind: K;
  symbol: string;
};

export type RealityCatalogInstrument = {
  symbol: string;
  underlyingTicker: string | null;
  kind: string;
  isReality: boolean;
};

export type CanonicalInstrumentIdentity = {
  us_equity: InstrumentLeg<"us_equity">;
  reality_token: InstrumentLeg<"reality_token"> | null;
  us_stock_perpetual: InstrumentLeg<"us_stock_perpetual"> | null;
};

export const MARKET_QUOTE_STALE_AFTER_MS = 120_000;
export const MARKET_QUOTE_FUTURE_SKEW_MS = 60_000;

export type InstrumentFreshnessStatus = "fresh" | "stale" | "unverified";
export type InstrumentFreshness = {
  providerTimestampMs: number | null;
  evaluatedAtMs: number;
  staleAfterMs: number;
  futureSkewMs: number;
  status: InstrumentFreshnessStatus;
};

export function isCanonicalInstrumentSymbol(kind: CanonicalInstrumentKind, symbol: string) {
  return INSTRUMENT_SYMBOL_PATTERNS[kind].test(symbol);
}

export function canonicalKindFromLegacy(kind: string): CanonicalInstrumentKind | null {
  if ((CANONICAL_INSTRUMENT_KINDS as readonly string[]).includes(kind)) return kind as CanonicalInstrumentKind;
  if (Object.hasOwn(LEGACY_INSTRUMENT_KINDS, kind)) return LEGACY_INSTRUMENT_KINDS[kind as LegacyInstrumentKind];
  return null;
}

export function canonicalKindForMarketAsset(asset: { kind: string; isReality: boolean }): CanonicalInstrumentKind | null {
  if (asset.kind === "rtoken") return asset.isReality ? "reality_token" : "us_stock_perpetual";
  return canonicalKindFromLegacy(asset.kind);
}

export function isRealityCatalogInstrument(asset: RealityCatalogInstrument): boolean {
  return asset.kind === "rtoken"
    && asset.isReality
    && typeof asset.underlyingTicker === "string"
    && isCanonicalInstrumentSymbol("us_equity", asset.underlyingTicker.toUpperCase())
    && isCanonicalInstrumentSymbol("reality_token", asset.symbol.toUpperCase());
}

export function linkCanonicalInstrument(input: {
  usEquitySymbol: string;
  realityTokenSymbol?: string | null;
  usStockPerpetualSymbol?: string | null;
}): CanonicalInstrumentIdentity | null {
  if (!isCanonicalInstrumentSymbol("us_equity", input.usEquitySymbol)) return null;
  const realityTokenSymbol = input.realityTokenSymbol ?? null;
  const usStockPerpetualSymbol = input.usStockPerpetualSymbol ?? null;
  if (realityTokenSymbol !== null && !isCanonicalInstrumentSymbol("reality_token", realityTokenSymbol)) return null;
  if (usStockPerpetualSymbol !== null && !isCanonicalInstrumentSymbol("us_stock_perpetual", usStockPerpetualSymbol)) return null;
  return {
    us_equity: { kind: "us_equity", symbol: input.usEquitySymbol },
    reality_token: realityTokenSymbol === null ? null : { kind: "reality_token", symbol: realityTokenSymbol },
    us_stock_perpetual: usStockPerpetualSymbol === null ? null : { kind: "us_stock_perpetual", symbol: usStockPerpetualSymbol },
  };
}

export function describeInstrumentFreshness(input: {
  providerTimestampMs: number | null;
  evaluatedAtMs: number;
  staleAfterMs?: number;
  futureSkewMs?: number;
}): InstrumentFreshness {
  const staleAfterMs = input.staleAfterMs ?? MARKET_QUOTE_STALE_AFTER_MS;
  const futureSkewMs = input.futureSkewMs ?? MARKET_QUOTE_FUTURE_SKEW_MS;
  const providerTimestampMs = typeof input.providerTimestampMs === "number" && Number.isFinite(input.providerTimestampMs) ? input.providerTimestampMs : null;
  const evaluatedAtMs = input.evaluatedAtMs;
  const timestampKnown = providerTimestampMs !== null
    && providerTimestampMs > 0
    && Number.isFinite(evaluatedAtMs)
    && providerTimestampMs <= evaluatedAtMs + futureSkewMs;
  const status: InstrumentFreshnessStatus = !timestampKnown
    ? "unverified"
    : evaluatedAtMs - providerTimestampMs <= staleAfterMs
      ? "fresh"
      : "stale";
  return { providerTimestampMs, evaluatedAtMs, staleAfterMs, futureSkewMs, status };
}
