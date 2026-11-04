/** Format disclosed prices without the three-digit fractional rounding default. */
export function formatPublicCapsulePrice(value: unknown, locale?: string): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(locale, { useGrouping: true, maximumFractionDigits: 12 }).format(value);
}
