import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../lib/email/geolocation.ts", import.meta.url), "utf8");
const javascript = ts.transpile(source.replace(/^import\s+["']server-only["'];\s*/m, ""), { module: ts.ModuleKind.ESNext });
const { formatApproximateLocation, resolveApproximateLocation } = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`);

test("geolocation prefers trusted platform headers and keeps only approximate context", async () => {
  const request = new Request("https://tidelight.app/auth/callback", { headers: { "x-vercel-ip-city": "Lagos", "x-vercel-ip-country-region": "LA", "x-vercel-ip-country": "NG" } });
  const result = await resolveApproximateLocation({ request, ip: "203.0.113.5", fetcher: async () => { throw new Error("provider should not be called"); } });
  assert.deepEqual(result, { city: "Lagos", region: "LA", country: null, countryCode: "NG", source: "vercel" });
  assert.equal(formatApproximateLocation(result), "Lagos, LA");
});

test("provider fallback is bounded and returns city, region, and country without coordinates", async () => {
  const request = new Request("https://tidelight.app/auth/callback");
  const result = await resolveApproximateLocation({
    request,
    ip: "198.51.100.9",
    fetcher: async () => new Response(JSON.stringify({ city: "Abuja", region: "Federal Capital Territory", country_name: "Nigeria", country_code: "NG", latitude: 9.07, longitude: 7.49 }), { status: 200 }),
  });
  assert.equal(formatApproximateLocation(result), "Abuja, Federal Capital Territory, Nigeria");
  assert.equal("latitude" in result, false);
  assert.equal("longitude" in result, false);
});

test("private or missing addresses never leave the server for geolocation", async () => {
  const request = new Request("https://tidelight.app/auth/callback");
  let called = false;
  const result = await resolveApproximateLocation({ request, ip: "192.168.1.20", fetcher: async () => { called = true; return new Response("{}", { status: 200 }); } });
  assert.equal(called, false);
  assert.equal(formatApproximateLocation(result), "Unavailable");
});
