const PUBLIC_CAPSULE_PATH = /^(?:\/flow)?\/capsule\/public\/[A-Za-z0-9_-]{43,}(?:\/.*)?$/;
const SAFE_PAGE_PATH = /^\/[A-Za-z0-9/_-]{0,120}$/;

export function sanitizePublicCapsulePath(value: unknown): string | undefined {
  if (typeof value !== "string" || !PUBLIC_CAPSULE_PATH.test(value)) return undefined;
  return "/capsule/public/[token]";
}

export function sanitizeFeedbackPage(value: unknown): string {
  if (typeof value !== "string") return "/";
  return sanitizePublicCapsulePath(value) ?? (SAFE_PAGE_PATH.test(value) ? value : "/");
}
