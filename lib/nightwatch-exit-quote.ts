/** Validate the venue timestamp before using a quote for a manual paper exit. */
export function isFreshNightwatchExitQuote(price: number | null, providerTimestamp: number | null, now = Date.now()): boolean {
  return typeof price === "number" && Number.isFinite(price) && price > 0
    && typeof providerTimestamp === "number" && Number.isFinite(providerTimestamp)
    && Number.isFinite(now) && providerTimestamp > 0
    && providerTimestamp <= now + 5_000 && now - providerTimestamp <= 120_000;
}
