export function isSupabaseAuthCookie(name: string): boolean {
  return /^sb-[a-z0-9-]+-auth-token(?:\.\d+)?$/i.test(name);
}

export function shouldMigrateSharedAuthCookies(hostname: string): boolean {
  return hostname.toLowerCase().replace(/:\d+$/, "") === "tidelight.app";
}

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
    try { value = decodeURIComponent(encodedValue); } catch { }
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

export function excludeRefreshedAuthCookies(
  cookies: Array<{ name: string; value: string }>,
  refreshedNames: ReadonlySet<string>,
): Array<{ name: string; value: string }> {
  return cookies.filter(({ name }) => !refreshedNames.has(name));
}
