export type UsageRangeDays = 7 | 30 | 90;

export function parseUsageRangeDays(value: string | null): UsageRangeDays {
  return value === "7" ? 7 : value === "30" ? 30 : value === "90" ? 90 : 30;
}
