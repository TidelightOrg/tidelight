import { describeInstrumentFreshness } from "./instrument-identity.ts";

/** Validate the venue timestamp before using a quote for a manual paper exit. */
export function isFreshNightwatchExitQuote(price: number | null, providerTimestamp: number | null, now = Date.now()): boolean {
  return typeof price === "number" && Number.isFinite(price) && price > 0
    && describeInstrumentFreshness({ providerTimestampMs: providerTimestamp, evaluatedAtMs: now, futureSkewMs: 5_000 }).status === "fresh";
}
