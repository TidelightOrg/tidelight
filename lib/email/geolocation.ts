import "server-only";

export type ApproximateLocation = {
  city: string | null;
  region: string | null;
  country: string | null;
  countryCode: string | null;
  source: "vercel" | "ipapi" | "unavailable";
};

const EMPTY_LOCATION: ApproximateLocation = { city: null, region: null, country: null, countryCode: null, source: "unavailable" };

function clean(value: string | null | undefined, limit = 80) {
  return (value ?? "").replace(/[\r\n<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, limit) || null;
}

function vercelLocation(request: Request): ApproximateLocation | null {
  const city = clean(request.headers.get("x-vercel-ip-city"));
  const region = clean(request.headers.get("x-vercel-ip-country-region"));
  const countryCode = clean(request.headers.get("x-vercel-ip-country"), 8)?.toUpperCase() ?? null;
  if (!city && !region && !countryCode) return null;
  return { city, region, country: null, countryCode, source: "vercel" };
}

function publicIp(ip: string) {
  if (!ip || ip === "Unavailable" || ip === "unknown" || ip.includes("://")) return false;
  if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(ip)) return false;
  const private172 = ip.match(/^172\.(\d{1,3})\./);
  if (private172 && Number(private172[1]) >= 16 && Number(private172[1]) <= 31) return false;
  if (ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80:")) return false;
  return true;
}

function label(location: ApproximateLocation) {
  const parts = [location.city, location.region, location.country].filter(Boolean);
  return parts.length ? parts.join(", ") : location.countryCode ?? "Unavailable";
}

export function formatApproximateLocation(location: ApproximateLocation) {
  return label(location);
}

export async function resolveApproximateLocation(input: { request: Request; ip: string; fetcher?: typeof fetch }) {
  const fromPlatform = vercelLocation(input.request);
  if (fromPlatform) return fromPlatform;
  if (!publicIp(input.ip)) return EMPTY_LOCATION;
  const fetcher = input.fetcher ?? fetch;
  const endpoint = (process.env.IP_GEOLOCATION_ENDPOINT ?? "https://ipapi.co").replace(/\/$/, "");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);
  try {
    const response = await fetcher(`${endpoint}/${encodeURIComponent(input.ip)}/json/`, { headers: { accept: "application/json" }, signal: controller.signal });
    if (!response.ok) return EMPTY_LOCATION;
    const data = await response.json() as { city?: unknown; region?: unknown; region_code?: unknown; country_name?: unknown; country_code?: unknown };
    const location: ApproximateLocation = {
      city: clean(typeof data.city === "string" ? data.city : null),
      region: clean(typeof data.region === "string" ? data.region : typeof data.region_code === "string" ? data.region_code : null),
      country: clean(typeof data.country_name === "string" ? data.country_name : null),
      countryCode: clean(typeof data.country_code === "string" ? data.country_code : null, 8)?.toUpperCase() ?? null,
      source: "ipapi",
    };
    return location.city || location.region || location.country || location.countryCode ? location : EMPTY_LOCATION;
  } catch {
    return EMPTY_LOCATION;
  } finally {
    clearTimeout(timeout);
  }
}
