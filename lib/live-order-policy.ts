/**
 * Real exchange orders stay disabled unless an operator explicitly opts a
 * deployment in after the product, legal, security, and operations reviews.
 * Paper and demo execution do not use this gate.
 * Missing configuration fails closed: only the exact string "true" enables writes.
 */
export function isLiveOrderExecutionEnabled(environment: NodeJS.ProcessEnv = process.env): boolean {
  return environment.TIDELIGHT_LIVE_ORDER_EXECUTION_ENABLED === "true";
}

export const LIVE_ORDER_DISABLED_MESSAGE =
  "Live exchange orders are disabled on Tidelight. Demo and paper workflows remain available.";

export const LIVE_ORDER_BLOCKED_REASON = "live_execution_disabled";

export class LiveOrderExecutionDisabledError extends Error {
  readonly code = "live_order_execution_disabled";
  constructor() {
    super(LIVE_ORDER_DISABLED_MESSAGE);
    this.name = "LiveOrderExecutionDisabledError";
  }
}

const PLACE_ORDER_PATH = /place-order|placeorder|batch-place|batch-order/i;

/** Live-credential writes, and any place-order path, are exchange order effects. */
export function isLiveExchangeOrderEffect(method: string, path: string): boolean {
  const verb = method.toUpperCase();
  const normalized = path.split("?")[0] ?? path;
  if (PLACE_ORDER_PATH.test(normalized)) return true;
  return verb !== "GET" && verb !== "HEAD";
}

/**
 * Refuse a private Bitget call that could place or prepare a live order.
 * Demo mode is never refused here. Reads stay available so a deployment can
 * still verify a key without sending an order.
 */
export function liveExchangeWriteRefused(
  mode: string,
  method: string,
  path: string,
  environment: NodeJS.ProcessEnv = process.env,
): boolean {
  if (mode !== "live") return false;
  if (isLiveOrderExecutionEnabled(environment)) return false;
  return isLiveExchangeOrderEffect(method, path);
}

export function liveOrderBlockedAudit(details: Record<string, unknown> = {}) {
  return {
    blocked: true,
    reason: LIVE_ORDER_BLOCKED_REASON,
    ...details,
    createdAt: new Date().toISOString(),
  };
}
