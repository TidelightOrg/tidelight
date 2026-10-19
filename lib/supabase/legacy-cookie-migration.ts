/** Supabase SSR stores auth cookies as one cookie or numbered chunks. */
export function isSupabaseAuthCookie(name: string): boolean {
  return /^sb-[a-z0-9-]+-auth-token(?:\.\d+)?$/i.test(name);
}

/** Only the primary app origin can safely move the old shared session to its own host. */
export function shouldMigrateSharedAuthCookies(hostname: string): boolean {
  return hostname.toLowerCase().replace(/:\d+$/, "") === "tidelight.app";
}

/**
 * Cookie headers can contain the same Supabase cookie name twice when an older
 * parent-domain cookie overlaps a newer host-only cookie. The request does not
 * tell us which scope each value came from, so never guess and overwrite the
 * host session with one of the ambiguous values.
 */
export function uniqueSupabaseAuthCookies(cookies: Array<{ name: string; value: string }>): Array<{ name: string; value: string }> {
  const byName = new Map<string, string[]>();
  for (const cookie of cookies) {
    if (!isSupabaseAuthCookie(cookie.name)) continue;
    const values = byName.get(cookie.name) ?? [];
    values.push(cookie.value);
    byName.set(cookie.name, values);
  }
  return [...byName].flatMap(([name, values]) => values.length === 1 ? [{ name, value: values[0] }] : []);
}
