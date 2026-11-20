import { describeInstrumentFreshness } from "./instrument-identity.ts";

export function isFreshNightwatchExitQuote(price: number | null, providerTimestamp: number | null, now = Date.now()): boolean {
  return typeof price === "number" && Number.isFinite(price) && price > 0
    && describeInstrumentFreshness({ providerTimestampMs: providerTimestamp, evaluatedAtMs: now, futureSkewMs: 5_000 }).status === "fresh";
}
