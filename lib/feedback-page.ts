const PUBLIC_CAPSULE_PATH = /^\/capsule\/public\/[A-Za-z0-9_-]{43}(?:\/.*)?$/;
const SAFE_PAGE_PATH = /^\/[A-Za-z0-9/_-]{0,120}$/;

/** Keep bearer tokens and query data out of feedback emails. */
export function sanitizeFeedbackPage(value: unknown): string {
  if (typeof value !== "string") return "/";
  if (PUBLIC_CAPSULE_PATH.test(value)) return "/capsule/public/[token]";
  return SAFE_PAGE_PATH.test(value) ? value : "/";
}
