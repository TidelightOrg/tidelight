/** Hypothetical mark-to-market loss relative to the supplied reference price. */
export function paperPositionStress(input: { direction: "long" | "short"; quantity: number; referencePrice: number; referenceTimestamp: number; margin: number; now: number }) {
  if (![input.quantity, input.referencePrice, input.referenceTimestamp, input.margin, input.now].every(Number.isFinite) || input.quantity <= 0 || input.referencePrice <= 0 || input.referenceTimestamp <= 0 || input.now - input.referenceTimestamp > 60_000 || input.referenceTimestamp - input.now > 5_000 || input.margin <= 0 || !Number.isFinite(new Date(input.referenceTimestamp).getTime()) || !Number.isFinite(input.quantity * input.referencePrice * 1.1) || !["long", "short"].includes(input.direction)) return null;
  const scenarios = [0.05, 0.10].map(shock => {
    const stressedPrice = input.referencePrice * (input.direction === "long" ? 1 - shock : 1 + shock);
    const loss = input.quantity * Math.abs(stressedPrice - input.referencePrice);
    return { shock, stressedPrice, loss, marginFraction: loss / input.margin };
  });
  return scenarios.every(s => [s.stressedPrice, s.loss, s.marginFraction].every(Number.isFinite)) ? scenarios : null;
}
