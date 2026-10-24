import test from "node:test";
import assert from "node:assert/strict";
import { requestedOAuthClientScopes } from "../lib/tic/oauth.ts";

test("MCP dynamic registration defaults to supported market and research scopes", () => {
  assert.deepEqual(requestedOAuthClientScopes(undefined), ["market:read", "research:run"]);
});

test("MCP dynamic registration preserves explicit least-privilege scopes", () => {
  assert.deepEqual(requestedOAuthClientScopes("market:read"), ["market:read"]);
  assert.deepEqual(requestedOAuthClientScopes("research:run"), ["research:run"]);
  assert.deepEqual(requestedOAuthClientScopes("market:read research:run"), ["market:read", "research:run"]);
  assert.equal(requestedOAuthClientScopes("market:write"), null);
});
