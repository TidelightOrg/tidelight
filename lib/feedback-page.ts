const PUBLIC_CAPSULE_PATH = /^(?:\/flow)?\/capsule\/public\/[A-Za-z0-9_-]{43,}(?:\/.*)?$/;
const SAFE_PAGE_PATH = /^\/[A-Za-z0-9/_-]{0,120}$/;

/** Redact a public capsule bearer path. Tokens may run past 43 characters, and the desk may prefix /flow. */
export function sanitizePublicCapsulePath(value: unknown): string | undefined {
  if (typeof value !== "string" || !PUBLIC_CAPSULE_PATH.test(value)) return undefined;
  return "/capsule/public/[token]";
}

/** Keep bearer tokens and query data out of feedback emails. */
export function sanitizeFeedbackPage(value: unknown): string {
  if (typeof value !== "string") return "/";
  return sanitizePublicCapsulePath(value) ?? (SAFE_PAGE_PATH.test(value) ? value : "/");
}
