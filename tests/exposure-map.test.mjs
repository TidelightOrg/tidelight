import test from "node:test";
import assert from "node:assert/strict";
import { findCatalogRealityAssets, mapResearchExposure } from "../lib/exposure-map.ts";

const catalog = [
  { symbol: "RNVDAUSDT", baseCoin: "rNVDA", name: "NVIDIA Corporation", underlyingTicker: "NVDA", kind: "rtoken", isReality: true },
  { symbol: "NVDAUSDT", baseCoin: "NVDA", name: "NVIDIA Corporation", underlyingTicker: "NVDA", kind: "rtoken", isReality: false },
  { symbol: "RFAKEUSDT", baseCoin: "rFAKE", name: "Fake Labs", underlyingTicker: "FAKE", kind: "rtoken", isReality: false },
  { symbol: "RUNKNOWNUSDT", baseCoin: "rUNKNOWN", name: "Unknown", underlyingTicker: null, kind: "rtoken", isReality: true },
  { symbol: "RNVDAUSDT", baseCoin: "rNVDA", name: "NVIDIA Corporation", underlyingTicker: "NVDA", kind: "rwa", isReality: false },
];

test("Reality exposure lookup returns only catalog-confirmed Reality instruments", () => {
  for (const query of ["NVDA", "RNVDAUSDT", "rNVDA", "NVIDIA"]) {
    assert.deepEqual(findCatalogRealityAssets(query, catalog).map((asset) => asset.symbol), ["RNVDAUSDT"]);
  }
  assert.deepEqual(findCatalogRealityAssets("FAKE", catalog), []);
  assert.deepEqual(findCatalogRealityAssets("UNKNOWN", catalog), []);
  assert.deepEqual(findCatalogRealityAssets("", catalog), []);
});

test("issuer context does not invent a Reality listing", () => {
  const [exposure] = mapResearchExposure("NVIDIA is reporting earnings this week.");
  assert.equal(exposure?.ticker, "NVDA");
  assert.equal(exposure?.issuer, "NVIDIA Corporation");
  assert.equal(exposure?.realityPair, null);
});
