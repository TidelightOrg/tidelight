export type ExecutionBookLevel = { price: number; size: number };
export type ExecutionSide = "buy" | "sell";
export type ExecutionAction = "open_long" | "open_short" | "close";
export type PositionDirection = "long" | "short" | null;

/** Best displayed prices must come from levels that can contribute executable size. */
export function bestExecutableBookPrices(asks: ExecutionBookLevel[], bids: ExecutionBookLevel[]) {
  const askPrices = asks.filter(level => Number.isFinite(level.price) && level.price > 0 && Number.isFinite(level.size) && level.size > 0).map(level => level.price);
  const bidPrices = bids.filter(level => Number.isFinite(level.price) && level.price > 0 && Number.isFinite(level.size) && level.size > 0).map(level => level.price);
  return { bestAsk: askPrices.length ? Math.min(...askPrices) : null, bestBid: bidPrices.length ? Math.max(...bidPrices) : null };
}

/** Advance a server-timestamped snapshot clock by elapsed client time since the request began (a conservative upper bound on response transit). */
export function serverAnchoredSnapshotNow(serverReceivedAt: number | null | undefined, clientRequestStartedAt: number | null | undefined, clientNow: number, processingMs = 0) {
  if (!Number.isFinite(serverReceivedAt) || !Number.isFinite(clientRequestStartedAt) || !Number.isFinite(clientNow)) return clientNow;
  return (serverReceivedAt as number) + Math.max(0, clientNow - (clientRequestStartedAt as number) - (Number.isFinite(processingMs) && processingMs >= 0 ? processingMs : 0));
}

/** Return only the side(s) implied by the proposed paper action. */
export function executionSidesForAction(action: ExecutionAction, direction: PositionDirection) {
  const primarySide: ExecutionSide | null = action === "open_long" ? "buy" : action === "open_short" ? "sell" : direction === "long" ? "sell" : direction === "short" ? "buy" : null;
  return { primarySide, secondarySide: action === "close" ? null : primarySide === "buy" ? "sell" : primarySide === "sell" ? "buy" : null } as const;
}

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
  receivedAt?: number;
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
  // Check venue skew at server receipt; use the advanced server clock for age.
  if (!Number.isFinite(input.quantity) || input.quantity <= 0 || !base.referencePrice || bookAgeMs === null || input.bookTimestamp! - (input.receivedAt ?? now) > 5_000 || bookAgeMs > maxAgeMs || validLevels.length === 0 || crossedBook) {
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

/** Evaluate smaller and larger visible-book sweeps using identical snapshot assumptions. */
export function estimateSizeSensitivity(input: Parameters<typeof estimateBookSweep>[0]) {
  return [0.5, 2].map(multiplier => ({ multiplier, sweep: estimateBookSweep({ ...input, quantity: input.quantity * multiplier }) }));
}
