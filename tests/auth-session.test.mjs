import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { decodeVerifiedAuthUser, encodeVerifiedAuthUser } from "../lib/supabase/verified-auth-claims.ts";

const root = new URL("../", import.meta.url);

test("server-render auth uses proxy-verified claims without trusting browser-supplied identity", async () => {
  const [authHelper, layout, sessionRoute, proxy] = await Promise.all([
    readFile(new URL("lib/supabase/auth-user.ts", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("app/api/auth/session/route.ts", root), "utf8"),
    readFile(new URL("proxy.ts", root), "utf8"),
  ]);

  assert.match(authHelper, /supabase\.auth\.getUser\(\)/);
  assert.doesNotMatch(authHelper, /from ["']react["']|auth\.getSession\(/);
  assert.match(authHelper, /decodeVerifiedAuthUser/);
  assert.match(proxy, /request\.headers\.delete\("x-tidelight-verified-auth-user"\)/);
  assert.match(proxy, /if \(!error\)[\s\S]*encodeVerifiedAuthUser\(data\?\.claims\)/);
  assert.match(proxy, /refreshedCookieWriters\.forEach\(\(writeCookie\) => writeCookie\(response\)\)/);
  assert.doesNotMatch(layout, /data-tic-auth-|data-tic-proxy-|cookieShape|cookieCount/);
  assert.doesNotMatch(sessionRoute, /probe|diagnostics|cookieShape|cookieCount/);
  assert.match(sessionRoute, /authenticated: Boolean\(user && !error\)/);
});

test("only a verified JWT subject and required identity metadata cross from Proxy to server renders", () => {
  const encoded = encodeVerifiedAuthUser({
    sub: "user-123",
    email: "user@example.com",
    email_confirmed_at: "2026-01-01T00:00:00Z",
    aud: "authenticated",
    app_metadata: { role: "operator", provider: "google", secret: "discard" },
    user_metadata: { full_name: "Tidelight User", avatar_url: "https://example.com/avatar.png", private_note: "discard" },
    session_id: "discard",
  });

  assert.ok(encoded);
  assert.deepEqual(decodeVerifiedAuthUser(encoded), {
    id: "user-123",
    email: "user@example.com",
    email_confirmed_at: "2026-01-01T00:00:00Z",
    aud: "authenticated",
    app_metadata: { role: "operator", provider: "google" },
    user_metadata: { full_name: "Tidelight User", avatar_url: "https://example.com/avatar.png" },
  });
  assert.equal(encodeVerifiedAuthUser({ email: "missing-subject@example.com" }), null);
  assert.equal(decodeVerifiedAuthUser("%not-json"), null);
  assert.equal(decodeVerifiedAuthUser("x".repeat(8193)), null);
});
