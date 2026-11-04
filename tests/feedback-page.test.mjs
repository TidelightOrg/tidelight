import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const { sanitizeFeedbackPage } = await import("../lib/feedback-page.ts");

test("feedback emails receive a route template instead of public capsule bearer tokens", async () => {
  const token = "a".repeat(43);
  assert.equal(sanitizeFeedbackPage(`/capsule/public/${token}`), "/capsule/public/[token]");
  assert.equal(sanitizeFeedbackPage(`/capsule/public/${token}?private=1`), "/");
  const route = await readFile(new URL("../app/api/feedback/route.ts", import.meta.url), "utf8");
  assert.match(route, /sanitizeFeedbackPage\(body\.page\)/);
});

test("feedback page sanitization retains safe page context and rejects arbitrary paths", () => {
  assert.equal(sanitizeFeedbackPage("/flow"), "/flow");
  assert.equal(sanitizeFeedbackPage("/capsule/public/short-token"), "/capsule/public/short-token");
  assert.equal(sanitizeFeedbackPage("/flow?token=secret"), "/");
  assert.equal(sanitizeFeedbackPage("https://example.com"), "/");
});
