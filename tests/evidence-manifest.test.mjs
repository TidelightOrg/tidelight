import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("public evidence manifest separates verified checks from missing/private artifacts", async () => {
  const source = await readFile(new URL("../public/evidence/manifest.json", import.meta.url), "utf8");
  const manifest = JSON.parse(source);
  assert.equal(manifest.schema_version, "1.0.0");
  assert.equal(manifest.evidence_boundary.fixtures_are_live_results, false);
  assert.equal(manifest.evidence_boundary.status, "index_only");
  assert.ok(manifest.evidence_inventory.some((item) => item.status === "production_verified"));
  assert.ok(manifest.evidence_inventory.some((item) => item.status === "private_owner_scoped"));
  assert.equal(manifest.verification.reproducibility.alpha.status, "needs_run_artifact");
  assert.equal(manifest.verification.reproducibility.agentic.status, "needs_public_run_export");
});

test("evidence page exposes the JSON download and names its limitations", async () => {
  const page = await readFile(new URL("../app/evidence/page.tsx", import.meta.url), "utf8");
  assert.match(page, /\/evidence\/manifest\.json/);
  assert.match(page, /not a performance claim/i);
  assert.match(page, /do not interpret the historical validation report as evidence of positive alpha/i);
});
