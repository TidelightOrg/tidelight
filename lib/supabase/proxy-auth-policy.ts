/** Verify cookies in Proxy only for app page requests. API handlers verify their own sessions. */
export function shouldVerifyProxyAuth(hostname: string, pathname: string): boolean {
  const host = hostname.toLowerCase().replace(/:\d+$/, "");
  return host === "tidelight.app" && !pathname.startsWith("/api/");
}
