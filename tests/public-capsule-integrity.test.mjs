import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";

const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "./decision-capsules") return { url: new URL("../lib/decision-capsules.ts", import.meta.url).href, shortCircuit: true };
  return nextResolve(specifier, context);
} });
const { hashCapsuleSnapshot } = await import("../lib/decision-capsules.ts");
const { canonicalPublicCapsuleJson, verifyPublicCapsuleDigest, verifyPublicCapsulePublication } = await import("../lib/public-capsule-integrity.ts");
hooks.deregister();

test("browser WebCrypto verifier matches the durable capsule canonical hash", async () => {
  const snapshot = { z: -0, a: { unicode: "NVIDIA ™", tiny: 1e-7, micro: 1e-6, near: 1.23e20, probability: 0.7 }, events: [{ sequence: 1, value: null }, { sequence: 2, value: true }] };
  const digest = hashCapsuleSnapshot(snapshot);
  assert.equal(canonicalPublicCapsuleJson(snapshot), JSON.stringify({ a: { micro: 0.000001, near: 123000000000000000000, probability: 0.7, tiny: 1e-7, unicode: "NVIDIA ™" }, events: [{ sequence: 1, value: null }, { sequence: 2, value: true }], z: 0 }));
  assert.equal(await verifyPublicCapsuleDigest(snapshot, digest), true);
  assert.equal(await verifyPublicCapsuleDigest(snapshot, "0".repeat(64)), false);
  assert.equal(await verifyPublicCapsuleDigest({ ...snapshot, later: undefined }, digest), false);
});

test("public publication envelope is accepted only when its snapshot matches the published digest", async () => {
  const snapshot = { event: { direction: "up", price: 123.45 }, evidence: ["source-1"] };
  const publication = {
    schemaVersion: 1,
    publishedAt: "2026-11-04T12:00:00.000Z",
    snapshot,
    integrityHash: hashCapsuleSnapshot(snapshot),
    hashAlgorithm: "sha256",
    integrity: "valid",
  };
  assert.deepEqual(await verifyPublicCapsulePublication(publication), publication);
  assert.equal(await verifyPublicCapsulePublication({ ...publication, integrityHash: "0".repeat(64) }), null);
  assert.equal(await verifyPublicCapsulePublication({ ...publication, snapshot: { ...snapshot, event: { direction: "down", price: 123.45 } } }), null);
});
