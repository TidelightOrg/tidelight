export type CapsuleOutcomeEvent = {
  id: string;
  type: "forecast" | "outcome";
  payload: Record<string, unknown>;
};

export type CapsuleOutcomeSummary = {
  forecastCount: number;
  outcomeCount: number;
  thresholdHits: number;
  thresholdHitRate: number | null;
  scoredCount: number;
  meanBrierScore: number | null;
  calibrationGap: number | null;
};

export const MIN_CALIBRATION_SAMPLE = 20;
const CALIBRATION_BINS = 5;

/** Summarize a server-verified event chain. User-entered observations stay explicitly descriptive. */
export function summarizeCapsuleOutcomes(events: CapsuleOutcomeEvent[]): CapsuleOutcomeSummary {
  const forecasts = new Map(events.filter(event => event.type === "forecast").map(event => [event.id, event]));
  const outcomes = events.filter(event => event.type === "outcome");
  let outcomeCount = 0;
  let thresholdHits = 0;
  let brierTotal = 0;
  let scoredCount = 0;
  const bins = Array.from({ length: CALIBRATION_BINS }, () => ({ count: 0, probabilityTotal: 0, hits: 0 }));

  for (const outcome of outcomes) {
    const forecastId = outcome.payload.forecastEventId;
    const forecast = typeof forecastId === "string" ? forecasts.get(forecastId) : undefined;
    const hit = outcome.payload.forecastMet;
    if (!forecast || typeof hit !== "boolean") continue;
    outcomeCount++;
    if (hit) thresholdHits++;
    const probability = forecast.payload.probability;
    if (typeof probability !== "number" || !Number.isFinite(probability) || probability < 0 || probability > 1) continue;
    const observed = hit ? 1 : 0;
    brierTotal += (probability - observed) ** 2;
    scoredCount++;
    const index = Math.min(CALIBRATION_BINS - 1, Math.floor(probability * CALIBRATION_BINS));
    bins[index].count++;
    bins[index].probabilityTotal += probability;
    if (hit) bins[index].hits++;
  }

  let calibrationGap: number | null = null;
  if (scoredCount >= MIN_CALIBRATION_SAMPLE) {
    calibrationGap = bins.reduce((gap, bin) => bin.count
      ? gap + bin.count / scoredCount * Math.abs(bin.probabilityTotal / bin.count - bin.hits / bin.count)
      : gap, 0);
  }

  return {
    forecastCount: forecasts.size,
    outcomeCount,
    thresholdHits,
    thresholdHitRate: outcomeCount ? thresholdHits / outcomeCount : null,
    scoredCount,
    meanBrierScore: scoredCount ? brierTotal / scoredCount : null,
    calibrationGap,
  };
}
