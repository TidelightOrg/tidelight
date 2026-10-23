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
  assert.match(component, /paper_orders: orders/);
});

test("public evidence inventory distinguishes the private ledger from historical captures", () => {
  const parsed = JSON.parse(manifest);
  const ledger = parsed.evidence_inventory.find((item) => item.id === "nightwatch-ledger");
  assert.equal(ledger.status, "private_owner_scoped");
  assert.match(ledger.claim, /full account ledger remains private to its account/);
  const captures = parsed.evidence_inventory.find((item) => item.id === "nightwatch-position-captures");
  assert.equal(captures.status, "public_historical_capture");
  assert.match(captures.claim, /not a live ledger query/);
  assert.equal(parsed.verification.reproducibility.agentic.status, "historical_static_capture");
});

test("Nightwatch replay confirmation discloses public directory visibility", async () => {
  assert.match(component, /public for 30 days and will appear in the Nightwatch replay directory linked from Judge Mode and the repository README/);
  assert.match(component, /identity, account balance, and other ledger rows are excluded/);
});

test("public position summary carries scope and provenance without raw account identifiers", async () => {
  const summary = JSON.parse(await readFile(new URL("../public/evidence/nightwatch-position-captures.json", import.meta.url), "utf8"));
  assert.equal(summary.scope.decisions_in_export, 23);
  assert.equal(summary.scope.paper_orders_in_export, 5);
  assert.equal(summary.scope.open_positions_in_export, 3);
  assert.equal(summary.positions.length, 3);
  assert.match(summary.provenance, /historical/i);
  assert.match(summary.provenance, /not a live database query/);
  assert.ok(summary.positions.every((position) => !("id" in position) && !("user_id" in position)));
});
