/**
 * Real exchange orders stay disabled unless an operator explicitly opts a
 * deployment in after the product, legal, security, and operations reviews.
 * Paper and demo execution do not use this gate.
 */
export function isLiveOrderExecutionEnabled(environment: NodeJS.ProcessEnv = process.env): boolean {
  return environment.TIDELIGHT_LIVE_ORDER_EXECUTION_ENABLED === "true";
}

export const LIVE_ORDER_DISABLED_MESSAGE =
  "Live exchange orders are disabled on Tidelight. Demo and paper workflows remain available.";
