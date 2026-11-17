import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

globalThis.researchExposureCatalog = { generatedAt: 1_800_000_000_000, assets: [] };
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "next/server") return { url: "data:text/javascript,export const NextResponse = { json: (body, init) => Response.json(body, init) };", shortCircuit: true };
  if (specifier === "@/lib/supabase/server") {
    return { url: `data:text/javascript,${encodeURIComponent('export const createClient = async () => ({ auth: { getUser: async () => ({ data: { user: { id: "researcher" } } }) } });')}`, shortCircuit: true };
  }
  if (specifier === "@/lib/bitget-market") {
    return { url: `data:text/javascript,${encodeURIComponent('export const getBitgetMarketUniverse = async () => { if (globalThis.researchExposureCatalog instanceof Error) throw globalThis.researchExposureCatalog; return { provider: "Bitget", ...globalThis.researchExposureCatalog }; };')}`, shortCircuit: true };
  }
  if (specifier === "@/lib/exposure-map") return nextResolve(new URL("../lib/exposure-map.ts", import.meta.url).href, context);
  return nextResolve(specifier, context);
} });
const { POST } = await import("../app/api/research/exposure/route.ts?catalog-test");
hooks.deregister();

const nvda = { symbol: "RNVDAUSDT", baseCoin: "rNVDA", name: "NVIDIA Corporation", underlyingTicker: "NVDA", kind: "rtoken", isReality: true, providerTimestamp: 1_800_000_000_000 };

test("exposure route returns the exact catalog-listed Reality instrument", async () => {
  globalThis.researchExposureCatalog = { generatedAt: 1_800_000_000_000, metadataStatus: "available", assets: [nvda, { ...nvda, symbol: "NVDAUSDT", kind: "rtoken", isReality: false }] };
  const response = await POST(new Request("https://tidelight.app/api/research/exposure", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: "NVIDIA" }) }));
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0].symbol, "RNVDAUSDT");
  assert.equal(result.matches[0].providerTimestamp, 1_800_000_000_000);
  assert.equal(result.catalogObservedAt, new Date(1_800_000_000_000).toISOString());
});

test("catalog failure returns unavailable instead of inferring a conventional Reality symbol", async () => {
  globalThis.researchExposureCatalog = new Error("provider unavailable");
  const response = await POST(new Request("https://tidelight.app/api/research/exposure", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: "NVIDIA" }) }));
  const result = await response.json();
  assert.equal(response.status, 503);
  assert.match(result.error, /catalog is unavailable/i);
  assert.equal("matches" in result, false);
});

test("partial catalog without Reality issuer metadata returns unavailable", async () => {
  globalThis.researchExposureCatalog = { generatedAt: 1_800_000_000_000, metadataStatus: "partial", assets: [nvda] };
  const response = await POST(new Request("https://tidelight.app/api/research/exposure", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: "NVIDIA" }) }));
  const result = await response.json();
  assert.equal(response.status, 503);
  assert.match(result.error, /issuer metadata is unavailable/i);
  assert.equal("matches" in result, false);
});

test("unlisted issuer has no instrument match", async () => {
  globalThis.researchExposureCatalog = { generatedAt: 1_800_000_000_000, metadataStatus: "available", assets: [] };
  const response = await POST(new Request("https://tidelight.app/api/research/exposure", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: "NVIDIA" }) }));
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(result.matches, []);
});
