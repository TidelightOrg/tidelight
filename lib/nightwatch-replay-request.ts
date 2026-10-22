const orderIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseNightwatchReplayOrderId(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const orderId = (value as Record<string, unknown>).orderId;
  return typeof orderId === "string" && orderIdPattern.test(orderId) ? orderId : null;
}
