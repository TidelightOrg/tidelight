export type ExecutionBookLevel = { price: number; size: number };
export type ExecutionSide = "buy" | "sell";

export type BookSweep = {
  status: "estimated" | "insufficient_depth" | "unavailable";
  side: ExecutionSide;
  requestedQuantity: number;
  filledQuantity: number;
  visibleCapacity: number;
  coveragePct: number;
  referencePrice: number | null;
  averagePrice: number | null;
  slippageBps: number | null;
  bookAgeMs: number | null;
};

/** Sweep only the levels returned by the venue. Never extrapolate unseen liquidity. */
export function estimateBookSweep(input: {
  levels: ExecutionBookLevel[];
  side: ExecutionSide;
  quantity: number;
  referencePrice: number | null;
  oppositeBestPrice?: number | null;
  bookTimestamp: number | null;
  now?: number;
  maxAgeMs?: number;
}): BookSweep {
  const now = input.now ?? Date.now();
  const maxAgeMs = input.maxAgeMs ?? 15_000;
  const bookAgeMs = input.bookTimestamp !== null && Number.isFinite(input.bookTimestamp) ? now - input.bookTimestamp : null;
  const validLevels = input.levels.filter(level => Number.isFinite(level.price) && level.price > 0 && Number.isFinite(level.size) && level.size > 0);
  const bestPrice = validLevels.length ? (input.side === "buy" ? Math.min(...validLevels.map(level => level.price)) : Math.max(...validLevels.map(level => level.price))) : null;
  const oppositeBestPrice = input.oppositeBestPrice;
  const crossedBook = bestPrice !== null && Number.isFinite(oppositeBestPrice) && (input.side === "buy" ? bestPrice < (oppositeBestPrice as number) : bestPrice > (oppositeBestPrice as number));
  const visibleCapacity = validLevels.reduce((sum, level) => sum + level.size, 0);
  const base = {
    side: input.side,
    requestedQuantity: input.quantity,
    filledQuantity: 0,
    visibleCapacity,
    coveragePct: 0,
    referencePrice: Number.isFinite(input.referencePrice) && (input.referencePrice ?? 0) > 0 ? input.referencePrice : null,
    averagePrice: null,
    slippageBps: null,
    bookAgeMs,
  } as const;
  if (!Number.isFinite(input.quantity) || input.quantity <= 0 || !base.referencePrice || bookAgeMs === null || bookAgeMs < -5_000 || bookAgeMs > maxAgeMs || validLevels.length === 0 || crossedBook) {
    return { ...base, status: "unavailable" };
  }

  const sorted = [...validLevels].sort((a, b) => input.side === "buy" ? a.price - b.price : b.price - a.price);
  let remaining = input.quantity;
  let filledQuantity = 0;
  let notional = 0;
  for (const level of sorted) {
    const take = Math.min(remaining, level.size);
    filledQuantity += take;
    notional += take * level.price;
    remaining -= take;
    if (remaining <= 1e-12) break;
  }
  const averagePrice = filledQuantity > 0 ? notional / filledQuantity : null;
  const signedMove = averagePrice === null ? null : input.side === "buy" ? averagePrice - base.referencePrice : base.referencePrice - averagePrice;
  return {
    ...base,
    status: remaining > Math.max(1e-12, input.quantity * 1e-9) ? "insufficient_depth" : "estimated",
    filledQuantity,
    coveragePct: Math.min(100, filledQuantity / input.quantity * 100),
    averagePrice,
    slippageBps: signedMove === null ? null : signedMove / base.referencePrice * 10_000,
  };
}
