import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../lib/email/account-security.ts", import.meta.url), "utf8");
const javascript = ts.transpile(source
  .replace(/^import\s+["']server-only["'];\s*/m, "")
  .replace(/^import\s+\{ enqueueSecurityEmail \}\s+from\s+["']\.\/nightwatch["'];\s*/m, "const enqueueSecurityEmail = async (input) => { globalThis.__securityQueue = input; return \"queued\"; };")
  .replace('import { formatApproximateLocation, resolveApproximateLocation } from "./geolocation";\n', "const formatApproximateLocation = (location) => [location.city, location.region, location.country].filter(Boolean).join(', ') || location.countryCode || 'Unavailable'; const resolveApproximateLocation = async ({ request }) => ({ city: request.headers.get('x-vercel-ip-city'), region: request.headers.get('x-vercel-ip-country-region'), country: null, countryCode: request.headers.get('x-vercel-ip-country'), source: 'vercel' });\n"), { module: ts.ModuleKind.ESNext });
const { queueAccountAuthNotice } = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`);

test("account auth notices capture bounded login context and queue a branded security email", async () => {
  let event;
  const admin = {
    from() {
      return {
        insert(value) { event = value; return Promise.resolve({ error: null }); },
      };
    },
  };
  const request = new Request("https://tidelight.app/auth/callback", { headers: { "user-agent": "Mozilla/5.0 Chrome/155.0.0.0 (Windows NT 10.0)", "x-forwarded-for": "203.0.113.5, 10.0.0.1", "x-vercel-ip-city": "Lagos", "x-vercel-ip-country-region": "LA", "x-vercel-ip-country": "NG" } });
  const result = await queueAccountAuthNotice({ admin, userId: "user-1", event: "new_login", request, at: new Date("2026-10-20T12:34:00Z") });
  assert.equal(event.event_type, "new_login");
  assert.equal(event.metadata.ip_address, "203.0.113.5");
  assert.match(result.title, /new login/i);
  assert.match(result.body, /203\.0\.113\.5/);
  assert.match(result.body, /Lagos, LA/);
  assert.match(result.body, /Chrome\/155/);
  assert.equal(globalThis.__securityQueue.eventKey, result.eventKey);
});

test("account auth notices sanitize forwarded header lines", async () => {
  const admin = { from() { return { insert() { return Promise.resolve({ error: null }); } }; } };
  const request = { headers: { get(name) { return name === "x-forwarded-for" ? "<script>\nunsafe" : name === "user-agent" ? "test\nagent" : null; } } };
  const result = await queueAccountAuthNotice({ admin, userId: "user-2", event: "new_signup", request, at: new Date("2026-10-20T12:34:00Z") });
  assert.doesNotMatch(result.body, /<script>\nunsafe/);
  assert.match(result.body, /workspace was created/i);
});
