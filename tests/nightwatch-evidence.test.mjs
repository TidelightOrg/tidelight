import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const component = await readFile(new URL("../app/ui/nightwatch-desk.tsx", import.meta.url), "utf8");
const manifest = await readFile(new URL("../public/evidence/manifest.json", import.meta.url), "utf8");

test("Nightwatch evidence export is explicit, local, and scope-bounded", () => {
  assert.match(component, /tidelight\.nightwatch-paper-evidence\.v1/);
  assert.match(component, /download = `tidelight-nightwatch-evidence-/);
  assert.match(component, /currently loaded in this view/);
  assert.match(component, /not uploaded by this action/);
  assert.match(component, /decision_runs: allRuns/);
  assert.match(component, /paper_orders: initialOrders/);
});

test("public evidence inventory describes owner-scoped paper records without publishing them", () => {
  const parsed = JSON.parse(manifest);
  const ledger = parsed.evidence_inventory.find((item) => item.id === "nightwatch-ledger");
  assert.equal(ledger.status, "private_owner_scoped");
  assert.match(ledger.claim, /no private user data/);
  assert.equal(parsed.verification.reproducibility.agentic.status, "private_owner_export_available");
});
