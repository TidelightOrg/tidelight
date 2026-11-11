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

const BLOCKED_ORDER_BODY_BYTES = 2048;

/** Read only a small preview. An oversized blocked request is still refused, without buffering it. */
export async function readBlockedOrderPreview(request: Request): Promise<{ symbol: string | null; action: string | null }> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > BLOCKED_ORDER_BODY_BYTES) return { symbol: null, action: null };
  if (!request.body) return { symbol: null, action: null };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > BLOCKED_ORDER_BODY_BYTES) {
        await reader.cancel();
        return { symbol: null, action: null };
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const preview = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as { symbol?: unknown; action?: unknown };
    return {
      symbol: typeof preview.symbol === "string" ? preview.symbol.toUpperCase().slice(0, 32) : null,
      action: typeof preview.action === "string" ? preview.action.slice(0, 32) : null,
    };
  } catch {
    return { symbol: null, action: null };
  } finally {
    reader.releaseLock();
  }
}
