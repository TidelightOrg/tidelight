import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function safeSupabaseFailureCode(error: unknown): string {
  let current = error;
  for (let depth = 0; depth < 5 && current && typeof current === "object"; depth += 1) {
    const candidate = current as { code?: unknown; cause?: unknown; name?: unknown; message?: unknown };
    if (typeof candidate.code === "string" && /^[A-Z0-9_-]{1,24}$/.test(candidate.code)) return candidate.code;
    if (candidate.name === "TimeoutError" || candidate.name === "AbortError") return candidate.name;
    if (typeof candidate.message === "string") {
      if (/\\b(fetch failed|failed to fetch|network request failed)\\b/i.test(candidate.message)) return "FETCH_FAILED";
      if (/\\b(timeout|timed out)\\b/i.test(candidate.message)) return "TIMEOUT";
    }
    current = candidate.cause;
  }
  return "unknown";
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
