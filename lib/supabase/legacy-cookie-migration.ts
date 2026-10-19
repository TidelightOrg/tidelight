/** Supabase SSR stores auth cookies as one cookie or numbered chunks. */
export function isSupabaseAuthCookie(name: string): boolean {
  return /^sb-[a-z0-9-]+-auth-token(?:\.\d+)?$/i.test(name);
}

/** Only the primary app origin can safely move the old shared session to its own host. */
export function shouldMigrateSharedAuthCookies(hostname: string): boolean {
  return hostname.toLowerCase().replace(/:\d+$/, "") === "tidelight.app";
}

/** Read raw Cookie header pairs before Next's cookie map collapses duplicate names. */
export function readSupabaseAuthCookieHeader(header: string | null): {
  cookies: Array<{ name: string; value: string }>;
  names: string[];
  duplicateNames: string[];
} {
  const byName = new Map<string, string[]>();
  for (const pair of header?.split(/;\s*/) ?? []) {
    const separator = pair.indexOf("=");
    if (separator < 1) continue;
    const name = pair.slice(0, separator).trim();
    if (!isSupabaseAuthCookie(name)) continue;
    const encodedValue = pair.slice(separator + 1);
    let value = encodedValue;
    try { value = decodeURIComponent(encodedValue); } catch { /* retain the raw value */ }
    const values = byName.get(name) ?? [];
    values.push(value);
    byName.set(name, values);
  }
  return {
    cookies: [...byName].flatMap(([name, values]) => values.length === 1 ? [{ name, value: values[0] }] : []),
    names: [...byName.keys()],
    duplicateNames: [...byName].flatMap(([name, values]) => values.length > 1 ? [name] : []),
  };
}
