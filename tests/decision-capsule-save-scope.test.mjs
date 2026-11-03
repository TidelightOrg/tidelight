import test from "node:test";
import assert from "node:assert/strict";
import { isCurrentDecisionCapsuleSave } from "../lib/decision-capsule-save-scope.ts";

test("a capsule save can update only its originating current research run", () => {
  const current = { currentGeneration: 4, requestGeneration: 4, currentRunId: "run-a", requestRunId: "run-a" };
  assert.equal(isCurrentDecisionCapsuleSave(current), true);
  assert.equal(isCurrentDecisionCapsuleSave({ ...current, currentGeneration: 5 }), false, "starting a newer request invalidates both prior success and error handlers");
  assert.equal(isCurrentDecisionCapsuleSave({ ...current, currentRunId: "run-b" }), false, "a response cannot attach run A's receipt to run B");
  assert.equal(isCurrentDecisionCapsuleSave({ ...current, currentRunId: null }), false, "a pending save cannot update the UI while research is in progress");
});
