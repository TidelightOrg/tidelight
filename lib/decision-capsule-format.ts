/** Format disclosed prices without the three-digit fractional rounding default. */
export function formatPublicCapsulePrice(value: unknown, locale?: string): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  if (value !== 0 && Math.abs(value) < 0.5e-12) return value.toExponential();
  return new Intl.NumberFormat(locale, { useGrouping: true, maximumFractionDigits: 12 }).format(value);
}
