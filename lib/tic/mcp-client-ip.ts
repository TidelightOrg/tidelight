/** Forward only the platform client-IP header used by the shared rate limiter. */
export function mcpRateLimitClientHeaders(incoming: Headers): Headers {
  const headers = new Headers();
  const forwarded = incoming.get("x-vercel-forwarded-for");
  if (forwarded) headers.set("x-vercel-forwarded-for", forwarded);
  else {
    const realIp = incoming.get("x-real-ip");
    if (realIp) headers.set("x-real-ip", realIp);
  }
  return headers;
}
