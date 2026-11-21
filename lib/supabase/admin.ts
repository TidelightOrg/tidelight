import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function safeSupabaseFailureCode(error: unknown): string {
  let current = error;
  let fallback = "NO_ERROR_DETAILS";
  for (let depth = 0; depth < 5 && current && typeof current === "object"; depth += 1) {
    const candidate = current as { code?: unknown; cause?: unknown; name?: unknown; message?: unknown; details?: unknown };
    if (typeof candidate.code === "string" && /^[A-Z0-9_-]{1,24}$/.test(candidate.code)) return candidate.code;
    if (candidate.name === "TimeoutError" || candidate.name === "AbortError") return candidate.name;
    if (typeof candidate.details === "string") {
      const detailCode = candidate.details.match(/\b(EAI_AGAIN|ENOTFOUND|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EHOSTUNREACH|EHOSTDOWN|UND_ERR_CONNECT_TIMEOUT|UND_ERR_HEADERS_OVERFLOW|ABORT_ERR)\b/i)?.[1];
      if (detailCode) return detailCode.toUpperCase();
      if (/\b(dns|name resolution)\b/i.test(candidate.details)) return "DNS_FAILURE";
      if (/\b(tls|ssl|certificate)\b/i.test(candidate.details)) return "TLS_FAILURE";
      if (/\b(socket|connection|connect|network|fetch|terminated|closed|reset|refused|unreachable)\b/i.test(candidate.details)) return "CONNECTION_FAILURE";
      if (candidate.details) fallback = "DETAILS_OTHER";
    }
    if (typeof candidate.message === "string") {
      if (/\b(fetch failed|failed to fetch|network request failed)\b/i.test(candidate.message)) return "FETCH_FAILED";
      if (/\b(timeout|timed out)\b/i.test(candidate.message)) return "TIMEOUT";
      if (candidate.message) {
        const messageType = candidate.message.trim().split(/\s+/, 1)[0].replace(/[^A-Za-z0-9]/g, "").slice(0, 24).toUpperCase();
        fallback = messageType ? `MESSAGE_${messageType}` : "MESSAGE_OTHER";
      }
    }
    if (typeof candidate.name === "string" && /^[A-Za-z][A-Za-z0-9]{0,31}$/.test(candidate.name)) {
      fallback = `NAME_${candidate.name.toUpperCase()}`;
    }
    current = candidate.cause;
  }
  return fallback;
}

async function fetchSupabase(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (error) {
    console.error("supabase-api-transport-failed", safeSupabaseFailureCode(error));
    throw error;
  }
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server secret is not configured.");
  return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: fetchSupabase } });
}
