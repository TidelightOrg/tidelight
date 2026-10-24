export type StatusPagePath = "/status" | "/status/incidents" | "/status/maintenance";

export function resolveStatusPagePath(hostname: string | null, pathname: StatusPagePath): string {
  const host = hostname?.toLowerCase().replace(/:\d+$/, "");
  if (host !== "status.tidelight.app") return pathname;
  if (pathname === "/status") return "/";
  return pathname.replace(/^\/status(?=\/)/, "");
}
