/** True only while a pending capsule save still belongs to the currently displayed research run. */
export function isCurrentDecisionCapsuleSave(input: {
  currentGeneration: number;
  requestGeneration: number;
  currentRunId: string | null | undefined;
  requestRunId: string;
}): boolean {
  return input.currentGeneration === input.requestGeneration && input.currentRunId === input.requestRunId;
}
