import test from "node:test";
import assert from "node:assert/strict";
import { STOCK_PERP_UNIVERSE } from "../lib/bitget-market.ts";
import {
  CANONICAL_INSTRUMENT_KINDS,
  INSTRUMENT_SYMBOL_PATTERNS,
  MARKET_QUOTE_FUTURE_SKEW_MS,
  MARKET_QUOTE_STALE_AFTER_MS,
  canonicalKindForMarketAsset,
  canonicalKindFromLegacy,
  canonicalIssuerIdFromSecCik,
  describeInstrumentFreshness,
  isRealityCatalogInstrument,
  linkCanonicalInstrument,
} from "../lib/instrument-identity.ts";

const now = Date.parse("2026-11-11T12:00:00.000Z");

test("one explicit identity links distinct, caller-verified instrument legs", () => {
  const identity = linkCanonicalInstrument({ usEquitySymbol: "NVDA", realityTokenSymbol: "RNVDAUSDT", usStockPerpetualSymbol: "NVDAUSDT" });
  assert.deepEqual(identity, {
    us_equity: { kind: "us_equity", symbol: "NVDA" },
    reality_token: { kind: "reality_token", symbol: "RNVDAUSDT" },
    us_stock_perpetual: { kind: "us_stock_perpetual", symbol: "NVDAUSDT" },
  });
  const symbols = [identity.us_equity.symbol, identity.reality_token.symbol, identity.us_stock_perpetual.symbol];
  assert.equal(new Set(symbols).size, symbols.length);
});

test("Reality identity validation requires the catalog's Reality flag and underlying ticker", () => {
  assert.equal(isRealityCatalogInstrument({ symbol: "RNVDAUSDT", underlyingTicker: "NVDA", kind: "rtoken", isReality: true }), true);
  assert.equal(isRealityCatalogInstrument({ symbol: "NVDAUSDT", underlyingTicker: "NVDA", kind: "rtoken", isReality: false }), false);
  assert.equal(isRealityCatalogInstrument({ symbol: "RNVDAUSDT", underlyingTicker: null, kind: "rtoken", isReality: true }), false);
  assert.equal(isRealityCatalogInstrument({ symbol: "RNVDAUSDT", underlyingTicker: "NVDA", kind: "crypto", isReality: false }), false);
});

test("a leg is omitted only when the caller does not supply it", () => {
  assert.deepEqual(linkCanonicalInstrument({ usEquitySymbol: "AAPL", realityTokenSymbol: "RAAPLUSDT" }), {
    us_equity: { kind: "us_equity", symbol: "AAPL" },
    reality_token: { kind: "reality_token", symbol: "RAAPLUSDT" },
    us_stock_perpetual: null,
  });
  assert.equal(linkCanonicalInstrument({ usEquitySymbol: "AAPL", usStockPerpetualSymbol: "" }), null);
  assert.equal(linkCanonicalInstrument({ usEquitySymbol: "aapl", realityTokenSymbol: "RAAPLUSDT", usStockPerpetualSymbol: "AAPLUSDT" }), null);
  assert.equal(linkCanonicalInstrument({ usEquitySymbol: "BRK.B", realityTokenSymbol: "RBRK.BUSDT", usStockPerpetualSymbol: "BRK.BUSDT" }), null);
});

test("legacy kind names map onto the capsule and evidence-graph vocabulary", () => {
  assert.deepEqual(CANONICAL_INSTRUMENT_KINDS, ["us_equity", "reality_token", "us_stock_perpetual"]);
  assert.equal(canonicalKindFromLegacy("us_equity"), "us_equity");
  assert.equal(canonicalKindFromLegacy("reality_token"), "reality_token");
  assert.equal(canonicalKindFromLegacy("us_stock_perpetual"), "us_stock_perpetual");
  assert.equal(canonicalKindFromLegacy("reality_tokenized_spot"), "reality_token");
  assert.equal(canonicalKindFromLegacy("tokenized_equity_spot"), "reality_token");
  assert.equal(canonicalKindFromLegacy("rtoken"), "reality_token");
  assert.equal(canonicalKindFromLegacy("stock-perpetual"), "us_stock_perpetual");
  assert.equal(canonicalKindFromLegacy("stock_perpetual"), "us_stock_perpetual");
  assert.equal(canonicalKindFromLegacy("rwa"), null);
  assert.equal(canonicalKindFromLegacy("crypto"), null);
  assert.equal(canonicalKindForMarketAsset({ kind: "rtoken", isReality: true }), "reality_token");
  assert.equal(canonicalKindForMarketAsset({ kind: "rtoken", isReality: false }), "us_stock_perpetual");
  assert.equal(canonicalKindForMarketAsset({ kind: "stock-perpetual", isReality: false }), "us_stock_perpetual");
});

test("verified SEC CIK values normalize to one stable issuer ID format", () => {
  assert.equal(canonicalIssuerIdFromSecCik("320193"), "sec-cik:0000320193");
  assert.equal(canonicalIssuerIdFromSecCik(320193), "sec-cik:0000320193");
  assert.equal(canonicalIssuerIdFromSecCik("0001652044"), "sec-cik:0001652044");
  assert.equal(canonicalIssuerIdFromSecCik(""), null);
  assert.equal(canonicalIssuerIdFromSecCik("0000000000"), null);
  assert.equal(canonicalIssuerIdFromSecCik("12345678901"), null);
  assert.equal(canonicalIssuerIdFromSecCik("CIK123"), null);
});

test("symbol shape does not choose the leg", () => {
  const asPerp = linkCanonicalInstrument({ usEquitySymbol: "NVDA", usStockPerpetualSymbol: "RNVDAUSDT" });
  assert.equal(asPerp.us_stock_perpetual.kind, "us_stock_perpetual");
  assert.equal(asPerp.us_stock_perpetual.symbol, "RNVDAUSDT");
  assert.equal(INSTRUMENT_SYMBOL_PATTERNS.reality_token.test("RNVDAUSDT"), true);
  assert.equal(INSTRUMENT_SYMBOL_PATTERNS.us_stock_perpetual.test("RNVDAUSDT"), true);
  assert.equal(INSTRUMENT_SYMBOL_PATTERNS.us_equity.test("NVDAUSDT"), true);
});

test("quote freshness uses the existing research age window", () => {
  assert.equal(MARKET_QUOTE_STALE_AFTER_MS, 120_000);
  assert.equal(MARKET_QUOTE_FUTURE_SKEW_MS, 60_000);
  assert.equal(describeInstrumentFreshness({ providerTimestampMs: now - 30_000, evaluatedAtMs: now }).status, "fresh");
  assert.equal(describeInstrumentFreshness({ providerTimestampMs: now - 120_000, evaluatedAtMs: now }).status, "fresh");
  assert.equal(describeInstrumentFreshness({ providerTimestampMs: now - 120_001, evaluatedAtMs: now }).status, "stale");
  assert.equal(describeInstrumentFreshness({ providerTimestampMs: now - 180_000, evaluatedAtMs: now }).status, "stale");
  assert.equal(describeInstrumentFreshness({ providerTimestampMs: null, evaluatedAtMs: now }).status, "unverified");
  assert.equal(describeInstrumentFreshness({ providerTimestampMs: 0, evaluatedAtMs: now }).status, "unverified");
  assert.equal(describeInstrumentFreshness({ providerTimestampMs: now + 60_000, evaluatedAtMs: now }).status, "fresh");
  assert.equal(describeInstrumentFreshness({ providerTimestampMs: now + 60_001, evaluatedAtMs: now }).status, "unverified");
  assert.equal(describeInstrumentFreshness({ providerTimestampMs: now - 1_000, evaluatedAtMs: Number.NaN }).status, "unverified");
  const described = describeInstrumentFreshness({ providerTimestampMs: now - 30_000, evaluatedAtMs: now });
  assert.deepEqual(described, {
    providerTimestampMs: now - 30_000,
    evaluatedAtMs: now,
    staleAfterMs: 120_000,
    futureSkewMs: 60_000,
    status: "fresh",
  });
});

test("nightwatch can keep its shorter future skew on the same descriptor", () => {
  const quoted = describeInstrumentFreshness({ providerTimestampMs: now + 5_000, evaluatedAtMs: now, futureSkewMs: 5_000 });
  assert.equal(quoted.status, "fresh");
  const ahead = describeInstrumentFreshness({ providerTimestampMs: now + 5_001, evaluatedAtMs: now, futureSkewMs: 5_000 });
  assert.equal(ahead.status, "unverified");
});

test("the stock-perpetual universe remains explicit and is never inferred from a Reality prefix", () => {
  assert.ok(STOCK_PERP_UNIVERSE.includes("NVDAUSDT"));
  assert.ok(!STOCK_PERP_UNIVERSE.includes("BRK.BUSDT"));
  assert.equal(canonicalKindForMarketAsset({ kind: "rtoken", isReality: false }), "us_stock_perpetual");
});
