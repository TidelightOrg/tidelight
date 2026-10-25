import test from "node:test";
import assert from "node:assert/strict";
import { shouldVerifyProxyAuth } from "../lib/supabase/proxy-auth-policy.ts";

test("Proxy verifies sessions for app pages but lets API handlers verify their own requests", () => {
  assert.equal(shouldVerifyProxyAuth("tidelight.app", "/overview"), true);
  assert.equal(shouldVerifyProxyAuth("TIDELIGHT.APP:443", "/settings"), true);
  assert.equal(shouldVerifyProxyAuth("tidelight.app", "/api/developers/usage"), false);
  assert.equal(shouldVerifyProxyAuth("tidelight.app", "/api/strategies/backtest"), false);
  assert.equal(shouldVerifyProxyAuth("api.tidelight.app", "/v1/research/jobs"), false);
  assert.equal(shouldVerifyProxyAuth("status.tidelight.app", "/status"), false);
});
