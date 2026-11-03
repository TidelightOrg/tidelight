/** Tab-scoped Judge results are optional; storage may be disabled or full. */
export const JUDGE_SESSION_KEY = "tidelight-judge-research-v1";

export function storeJudgeResult(result: unknown): boolean {
  try {
    const value = JSON.stringify(result);
    if (value.length >= 1_500_000) return false;
    sessionStorage.setItem(JUDGE_SESSION_KEY, value);
    return true;
  } catch { return false; }
}

export function clearJudgeResult(): boolean {
  try { sessionStorage.removeItem(JUDGE_SESSION_KEY); return true; } catch { return false; }
}
