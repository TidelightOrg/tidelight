export function isCurrentDecisionCapsuleSave(input: {
  currentGeneration: number;
  requestGeneration: number;
  currentRunId: string | null | undefined;
  requestRunId: string;
}): boolean {
  return input.currentGeneration === input.requestGeneration && input.currentRunId === input.requestRunId;
}
