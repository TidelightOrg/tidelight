import test from "node:test";
import assert from "node:assert/strict";
import { mcpRateLimitClientHeaders } from "../lib/tic/mcp-client-ip.ts";

test("MCP public reads forward the platform client IP, preferring the Vercel header", () => {
  const headers = mcpRateLimitClientHeaders(new Headers({ "x-vercel-forwarded-for": "203.0.113.4", "x-real-ip": "203.0.113.5" }));
  assert.equal(headers.get("x-vercel-forwarded-for"), "203.0.113.4");
  assert.equal(headers.get("x-real-ip"), null);
});

test("MCP public reads preserve the shared rate limiter's x-real-ip fallback", () => {
  const headers = mcpRateLimitClientHeaders(new Headers({ "x-real-ip": "203.0.113.5" }));
  assert.equal(headers.get("x-vercel-forwarded-for"), null);
  assert.equal(headers.get("x-real-ip"), "203.0.113.5");
});
