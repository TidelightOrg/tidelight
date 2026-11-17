import type { BacktestMetrics } from "@/lib/backtest";

const REQUIRED_NUMBERS = ["totalReturnPct", "buyAndHoldReturnPct", "maxDrawdownPct", "endingEquity"] as const;
const NULLABLE_NUMBERS = ["sharpeRatio", "sortinoRatio", "winRatePct"] as const;

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function sameNumber(left: unknown, right: unknown) {
  if (typeof left !== "number" || typeof right !== "number" || !Number.isFinite(left) || !Number.isFinite(right)) return false;
  return Math.abs(left - right) <= 1e-12 * Math.max(1, Math.abs(left), Math.abs(right));
}

function sameNullableNumber(left: unknown, right: unknown) {
  return left === null || right === null ? left === right : sameNumber(left, right);
}

function sameRows(left: unknown, right: unknown, keys: readonly string[]) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length || left.length > 1000) return false;
  return left.every((leftItem, index) => {
    const a = object(leftItem);
    const b = object(right[index]);
    return Boolean(a && b && keys.every(key => key.endsWith("At") || key === "timestamp" ? a[key] === b[key] : sameNumber(a[key], b[key])));
  });
}

/** Compare archived metrics with a fresh calculation from the same saved candles. */
export function backtestMetricsMatch(saved: unknown, reproduced: BacktestMetrics): boolean {
  const original = object(saved);
  if (!original) return false;
  if (!REQUIRED_NUMBERS.every(key => sameNumber(original[key], reproduced[key]))) return false;
  if (!NULLABLE_NUMBERS.every(key => sameNullableNumber(original[key], reproduced[key]))) return false;
  if (!Number.isSafeInteger(original.trades) || original.trades !== reproduced.trades) return false;
  if (!Number.isSafeInteger(original.candles) || original.candles !== reproduced.candles) return false;
  return sameRows(original.tradeLog, reproduced.tradeLog, ["entryTime", "exitTime", "entryPrice", "exitPrice", "returnPct"])
    && sameRows(original.equityCurve, reproduced.equityCurve, ["timestamp", "equity"]);
}
