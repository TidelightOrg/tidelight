type Claims = Record<string, unknown>;

function record(value: unknown): Claims {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Claims : {};
}

function stringField(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function pick(source: unknown, keys: string[]): Claims {
  const input = record(source);
  return Object.fromEntries(keys.flatMap((key) => input[key] === undefined ? [] : [[key, input[key]]]));
}

/** Minimize identity data forwarded from Proxy after Supabase validates the JWT. */
export function encodeVerifiedAuthUser(claimsValue: unknown): string | null {
  const claims = record(claimsValue);
  const id = stringField(claims.sub);
  if (!id) return null;

  const snapshot = {
    id,
    email: stringField(claims.email) ?? null,
    email_confirmed_at: stringField(claims.email_confirmed_at) ?? null,
    aud: stringField(claims.aud) ?? "authenticated",
    app_metadata: pick(claims.app_metadata, ["role", "roles", "provider"]),
    user_metadata: pick(claims.user_metadata, ["full_name", "name", "avatar_url", "picture"]),
  };
  return encodeURIComponent(JSON.stringify(snapshot));
}

/** Decode only the compact identity snapshot emitted by the trusted Proxy. */
export function decodeVerifiedAuthUser(encoded: string | null): {
  id: string;
  email: string | null;
  email_confirmed_at: string | null;
  aud: string;
  app_metadata: Claims;
  user_metadata: Claims;
} | null {
  if (!encoded || encoded.length > 8192) return null;
  try {
    const value = JSON.parse(decodeURIComponent(encoded)) as unknown;
    const user = record(value);
    if (typeof user.id !== "string" || !user.id) return null;
    return {
      id: user.id,
      email: stringField(user.email) ?? null,
      email_confirmed_at: stringField(user.email_confirmed_at) ?? null,
      aud: stringField(user.aud) ?? "authenticated",
      app_metadata: record(user.app_metadata),
      user_metadata: record(user.user_metadata),
    };
  } catch {
    return null;
  }
}
