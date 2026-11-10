import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const { sanitizeFeedbackPage, sanitizePublicCapsulePath } = await import("../lib/feedback-page.ts");

test("feedback emails receive a route template instead of public capsule bearer tokens", async () => {
  const token = "a".repeat(43);
  assert.equal(sanitizeFeedbackPage(`/capsule/public/${token}`), "/capsule/public/[token]");
  assert.equal(sanitizeFeedbackPage(`/capsule/public/${token}/`), "/capsule/public/[token]");
  assert.equal(sanitizeFeedbackPage(`/capsule/public/${token}/nested/path`), "/capsule/public/[token]");
  assert.equal(sanitizeFeedbackPage(`/capsule/public/${token}x`), "/capsule/public/[token]");
  assert.equal(sanitizeFeedbackPage(`/capsule/public/${"b".repeat(50)}`), "/capsule/public/[token]");
  assert.equal(sanitizeFeedbackPage(`/flow/capsule/public/${token}`), "/capsule/public/[token]");
  assert.equal(sanitizeFeedbackPage(`/flow/capsule/public/${token}/nested`), "/capsule/public/[token]");
  assert.equal(sanitizeFeedbackPage(`/capsule/public/${token}?private=1`), "/");
  assert.equal(sanitizePublicCapsulePath(`/flow/capsule/public/${token}x`), "/capsule/public/[token]");
  assert.equal(sanitizePublicCapsulePath("/research"), undefined);
  const [feedback, support] = await Promise.all([
    readFile(new URL("../app/api/feedback/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/support/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(feedback, /sanitizeFeedbackPage\(body\.page\)/);
  assert.match(support, /sanitizePublicCapsulePath\(requestedPath\)/);
});

test("feedback page sanitization retains safe page context and rejects arbitrary paths", () => {
  assert.equal(sanitizeFeedbackPage("/flow"), "/flow");
  assert.equal(sanitizeFeedbackPage("/capsule/public/short-token"), "/capsule/public/short-token");
  assert.equal(sanitizeFeedbackPage("/flow/capsule/public/short-token"), "/flow/capsule/public/short-token");
  assert.equal(sanitizeFeedbackPage("/flow?token=secret"), "/");
  assert.equal(sanitizeFeedbackPage("https://example.com"), "/");
});
