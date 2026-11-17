const REQUEST_ID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isRequestCorrelationId(value: string | null | undefined): value is string {
  return Boolean(value && REQUEST_ID_V4.test(value));
}

/** Read the server-generated request ID forwarded by the application proxy. */
export function readRequestCorrelationId(request: Request): string | null {
  const requestId = request.headers.get("x-tidelight-request-id");
  return isRequestCorrelationId(requestId) ? requestId : null;
}

