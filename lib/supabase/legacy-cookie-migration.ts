/** Supabase SSR stores auth cookies as one cookie or numbered chunks. */
export function isSupabaseAuthCookie(name: string): boolean {
  return /^sb-[a-z0-9-]+-auth-token(?:\.\d+)?$/i.test(name);
}

/** Only the primary app origin can safely move the old shared session to its own host. */
export function shouldMigrateSharedAuthCookies(hostname: string): boolean {
  return hostname.toLowerCase().replace(/:\d+$/, "") === "tidelight.app";
}
