export const SUPPORT_ECOSYSTEMS = ["tidelight", "intelligence", "packages"] as const;
export type SupportEcosystem = (typeof SUPPORT_ECOSYSTEMS)[number];
export const SUPPORT_STATUSES = ["open", "awaiting_user", "resolved", "cancelled"] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];

export function isSupportEcosystem(value: unknown): value is SupportEcosystem {
  return typeof value === "string" && SUPPORT_ECOSYSTEMS.includes(value as SupportEcosystem);
}

export function isSupportStatus(value: unknown): value is SupportStatus {
  return typeof value === "string" && SUPPORT_STATUSES.includes(value as SupportStatus);
}

export function containsCredentialLikeContent(value: string): boolean {
  return /-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(?:AIza|sk-)[A-Za-z0-9_-]{16,}|\b[A-Za-z0-9_-]{35,}\.[A-Za-z0-9_-]{35,}\.[A-Za-z0-9_-]{20,}/.test(value)
    || /\b(?:api\s*secret|passphrase|password|otp|verification\s*code)\s*[:=]\s*\S{5,}/i.test(value);
}

export function escapeSupportHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

export async function readBoundedJson(request: Request, maxBytes: number): Promise<{ value: unknown; error?: "too_large" | "invalid" }> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > maxBytes) return { value: null, error: "too_large" };
  if (!request.body) return { value: null, error: "invalid" };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) {
        await reader.cancel();
        return { value: null, error: "too_large" };
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return { value: JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) };
  } catch {
    return { value: null, error: "invalid" };
  } finally {
    reader.releaseLock();
  }
}

export function emailSubjectLine(value: string): string {
  return value.replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, 140);
}
