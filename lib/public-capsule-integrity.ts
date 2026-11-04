type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord => Boolean(value && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype);

/** Canonical JSON shared with the server capsule hash: sorted object keys, ordered arrays. */
export function canonicalPublicCapsuleJson(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalPublicCapsuleJson).join(",")}]`;
  if (isRecord(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalPublicCapsuleJson(value[key])}`).join(",")}}`;
  throw new TypeError("Snapshot is not canonical JSON.");
}

/** Independently verify a disclosed capsule snapshot in a browser or WebCrypto runtime. */
export async function verifyPublicCapsuleDigest(snapshot: JsonRecord, expected: string): Promise<boolean> {
  if (!/^[a-f0-9]{64}$/.test(expected) || !globalThis.crypto?.subtle) return false;
  try {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonicalPublicCapsuleJson(snapshot)));
    const actual = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
    return actual === expected;
  } catch { return false; }
}
