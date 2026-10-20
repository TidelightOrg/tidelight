import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { containsCredentialLikeContent, emailSubjectLine, escapeSupportHtml, isSupportEcosystem, isSupportStatus, readBoundedJson } from "../lib/developer-support.ts";
import { excludeRefreshedAuthCookies, isSupabaseAuthCookie, readSupabaseAuthCookieHeader, shouldMigrateSharedAuthCookies } from "../lib/supabase/legacy-cookie-migration.ts";

const root = new URL("../", import.meta.url);

test("developer support accepts only named systems and ticket states", () => {
  assert.equal(isSupportEcosystem("packages"), true);
  assert.equal(isSupportEcosystem("intelligence"), true);
  assert.equal(isSupportEcosystem("operator"), false);
  assert.equal(isSupportStatus("awaiting_user"), true);
  assert.equal(isSupportStatus("deleted"), false);
});

test("support blocks credential-like content and escapes HTML for notifications", () => {
  assert.equal(containsCredentialLikeContent("My password: secret123"), true);
  assert.equal(containsCredentialLikeContent("I need help with an install"), false);
  assert.equal(escapeSupportHtml("<script>&'\""), "&lt;script&gt;&amp;&#39;&quot;");
});

test("support request parsing enforces byte limits without Content-Length and sanitizes email subjects", async () => {
  const valid = await readBoundedJson(new Request("https://tidelight.app/api", { method: "POST", body: JSON.stringify({ message: "hello" }) }), 100);
  assert.deepEqual(valid.value, { message: "hello" });
  const tooLarge = await readBoundedJson(new Request("https://tidelight.app/api", { method: "POST", body: "x".repeat(101) }), 100);
  assert.equal(tooLarge.error, "too_large");
  assert.equal(emailSubjectLine("New message:\r\nBcc: attacker@example.com"), "New message: Bcc: attacker@example.com");
});

test("legacy auth cookie migration is host-scoped and recognizes Supabase chunks", () => {
  assert.equal(isSupabaseAuthCookie("sb-abcd1234-auth-token"), true);
  assert.equal(isSupabaseAuthCookie("sb-abcd1234-auth-token.2"), true);
  assert.equal(isSupabaseAuthCookie("sb-abcd1234-other"), false);
  assert.equal(shouldMigrateSharedAuthCookies("tidelight.app"), true);
  assert.equal(shouldMigrateSharedAuthCookies("tidelight.app:3000"), true);
  assert.equal(shouldMigrateSharedAuthCookies("package.tidelight.app"), false);
  assert.equal(shouldMigrateSharedAuthCookies("docs.tidelight.app"), false);
});

test("legacy auth cookie migration never guesses between duplicate host and parent-domain values", () => {
  const parsed = readSupabaseAuthCookieHeader("sb-project-auth-token=host-session; sb-project-auth-token=old-parent-session; sb-project-auth-token.0=chunk%2D0; theme=light");
  assert.deepEqual(parsed.cookies, [{ name: "sb-project-auth-token.0", value: "chunk-0" }]);
  assert.deepEqual(parsed.names, ["sb-project-auth-token", "sb-project-auth-token.0"]);
  assert.deepEqual(parsed.duplicateNames, ["sb-project-auth-token"]);
  assert.deepEqual(readSupabaseAuthCookieHeader("sb-project-auth-token=only-session").cookies, [
    { name: "sb-project-auth-token", value: "only-session" },
  ]);
  assert.deepEqual(excludeRefreshedAuthCookies([
    { name: "sb-project-auth-token", value: "stale-access-token" },
    { name: "sb-project-auth-token.0", value: "unchanged-chunk" },
  ], new Set(["sb-project-auth-token"])), [
    { name: "sb-project-auth-token.0", value: "unchanged-chunk" },
  ]);
});

test("operator routes are server-guarded and requester reads remain account-scoped", async () => {
  const adminPage = await readFile(new URL("app/operator/developer-support/page.tsx", root), "utf8");
  const adminApi = await readFile(new URL("app/api/admin/developer-support/tickets/route.ts", root), "utf8");
  const ticketsApi = await readFile(new URL("app/api/developer-support/tickets/route.ts", root), "utf8");
  const threadApi = await readFile(new URL("app/api/developer-support/tickets/[ticketId]/route.ts", root), "utf8");
  const schema = await readFile(new URL("supabase/migrations/20261018153216_developer_support_tickets.sql", root), "utf8");
  assert.match(adminPage, /isTidelightOperator\(user\)/);
  assert.match(adminApi, /isTidelightOperator\(user\)/);
  assert.match(ticketsApi, /eq\("requester_user_id", user\.id\)/);
  assert.match(threadApi, /isTidelightOperator\(user\)/);
  assert.match(schema, /enable row level security/);
  assert.match(schema, /from public, anon, authenticated/);
});
