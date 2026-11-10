import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { LIVE_ORDER_DISABLED_MESSAGE, LiveOrderExecutionDisabledError, liveExchangeWriteRefused } from "../lib/live-order-policy.ts";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const mocks = {
  "next/server": "export class NextResponse extends Response { static json(data, init = {}) { return Response.json(data, init); } }",
  "@/lib/supabase/server": "export const createClient = async () => globalThis.liveOrderRouteTest.supabase;",
  "@/lib/supabase/admin": "export const createAdminClient = () => globalThis.liveOrderRouteTest.admin;",
  "@/lib/bitget-private": `
    export class BitgetRequestError extends Error { constructor(code, status) { super("bitget-request-rejected"); this.code = code; this.status = status; } }
    export const getBitgetCredentials = async () => { globalThis.liveOrderRouteTest.credentialReads += 1; return globalThis.liveOrderRouteTest.credentials; };
    export const bitgetPrivateRequest = async (credentials, method, requestPath) => {
      globalThis.liveOrderRouteTest.privateCalls.push({ mode: credentials.mode, method, path: requestPath });
      if (String(requestPath).includes("account/settings")) return { data: { holdMode: "one_way_mode", symbolConfigList: [{ category: "USDT-FUTURES", symbol: "NVDAUSDT", marginMode: "isolated", leverage: "10" }] } };
      if (String(requestPath).includes("current-position")) return { data: { list: [] } };
      if (String(requestPath).includes("account/assets")) return { data: { assets: [{ coin: "USDT", available: "10000" }] } };
      return { data: { orderId: "mock-order", clientOid: "mock-client" } };
    };
  `,
  "@/lib/bitget-market": `
    export const STOCK_PERP_UNIVERSE = ["NVDAUSDT"];
    export const getBitgetAsset = async () => globalThis.liveOrderRouteTest.asset;
    export const getBitgetStockPerp = async () => globalThis.liveOrderRouteTest.perp;
  `,
};

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (mocks[specifier]) return { url: `data:text/javascript,${encodeURIComponent(mocks[specifier])}`, shortCircuit: true };
    if (specifier === "server-only") return { url: "data:text/javascript,export {};", shortCircuit: true };
    if (specifier === "@/lib/live-order-policy") return { url: pathToFileURL(path.join(root, "lib/live-order-policy.ts")).href, shortCircuit: true };
    if (specifier === "@/lib/bitget-order-policy") return { url: pathToFileURL(path.join(root, "lib/bitget-order-policy.ts")).href, shortCircuit: true };
    if (specifier.startsWith("@/lib/bitget-private") && context.parentURL?.includes("/lib/bitget-private.ts")) return nextResolve(specifier, context);
    return nextResolve(specifier, context);
  },
});

const spot = await import("../app/api/bitget/order/route.ts?live-order-request");
const futures = await import("../app/api/futures/live-order/route.ts?live-order-request");
hooks.deregister();

globalThis.liveOrderPolicy = { LiveOrderExecutionDisabledError, liveExchangeWriteRefused };
const privateSource = await readFile(new URL("../lib/bitget-private.ts", import.meta.url), "utf8");
const privateJavaScript = ts.transpile(privateSource
  .replace(/^import "server-only";\n/, "")
  .replace(
    'import { createAdminClient } from "@/lib/supabase/admin";\nimport { LiveOrderExecutionDisabledError, liveExchangeWriteRefused } from "@/lib/live-order-policy";',
    "const createAdminClient = () => { throw new Error(\"unused in this test\"); };\nconst { LiveOrderExecutionDisabledError, liveExchangeWriteRefused } = globalThis.liveOrderPolicy;",
  ), { module: ts.ModuleKind.ESNext });
const { bitgetPrivateRequest } = await import(`data:text/javascript;base64,${Buffer.from(privateJavaScript).toString("base64")}`);

function resetState(overrides = {}) {
  const events = [];
  const privateCalls = [];
  const state = {
    user: { id: "user-approved" },
    credentials: { apiKey: "key", apiSecret: "secret", passphrase: "pass", mode: "live" },
    credentialReads: 0,
    mfaChecks: 0,
    events,
    privateCalls,
    asset: { isReality: true, kind: "rtoken", quoteCoin: "USDT", lastPrice: 100 },
    perp: { lastPrice: 100, providerTimestamp: Date.now() },
    allowNetwork: false,
    ...overrides,
  };
  state.supabase = {
    auth: {
      getUser: async () => ({ data: { user: state.user } }),
      mfa: {
        getAuthenticatorAssuranceLevel: async () => {
          state.mfaChecks += 1;
          return { data: { currentLevel: "aal2" } };
        },
      },
    },
    from(table) {
      const builder = {
        select() { return builder; },
        eq() { return builder; },
        gte() { return builder; },
        insert(values) {
          events.push({ table, values });
          return Promise.resolve({ error: null });
        },
        then(resolve, reject) {
          return Promise.resolve({ count: 0, error: null }).then(resolve, reject);
        },
      };
      return builder;
    },
  };
  state.admin = {
    from() {
      const builder = {
        select() { return builder; },
        eq() { return builder; },
        maybeSingle: async () => ({ data: { status: "approved", accepted_terms: true }, error: null }),
      };
      return builder;
    },
  };
  globalThis.liveOrderRouteTest = state;
  return state;
}

function post(pathname, body) {
  return new Request(`https://tidelight.app${pathname}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function withSwitch(t, value) {
  const previous = process.env.TIDELIGHT_LIVE_ORDER_EXECUTION_ENABLED;
  if (value === undefined) delete process.env.TIDELIGHT_LIVE_ORDER_EXECUTION_ENABLED;
  else process.env.TIDELIGHT_LIVE_ORDER_EXECUTION_ENABLED = value;
  t.after(() => {
    if (previous === undefined) delete process.env.TIDELIGHT_LIVE_ORDER_EXECUTION_ENABLED;
    else process.env.TIDELIGHT_LIVE_ORDER_EXECUTION_ENABLED = previous;
  });
}

test("an MFA-satisfied live spot order is refused when the switch is missing, and the same request is sent when it is on", async (t) => {
  withSwitch(t);
  const state = resetState();
  t.mock.method(globalThis, "fetch", () => { throw new Error("Bitget was called from the spot route"); });
  const body = { symbol: "RNVDAUSDT", side: "sell", orderType: "market", quantity: 1, confirmation: "PLACE LIVE ORDER" };
  const denied = await spot.POST(post("/api/bitget/order", body));
  assert.equal(denied.status, 403);
  assert.deepEqual(await denied.json(), { error: LIVE_ORDER_DISABLED_MESSAGE });
  assert.equal(state.privateCalls.length, 0);
  assert.equal(state.events.length, 1);
  assert.equal(state.events[0].table, "security_events");
  assert.equal(state.events[0].values.event_type, "bitget_order_attempt");
  assert.equal(state.events[0].values.metadata.blocked, true);
  assert.equal(state.events[0].values.metadata.reason, "live_execution_disabled");
  assert.equal(state.events[0].values.metadata.product, "SPOT");
  assert.equal(state.events[0].values.user_id, "user-approved");

  process.env.TIDELIGHT_LIVE_ORDER_EXECUTION_ENABLED = "true";
  state.privateCalls = [];
  state.events = [];
  const allowed = await spot.POST(post("/api/bitget/order", body));
  assert.equal(allowed.status, 200);
  assert.equal(state.mfaChecks, 1);
  assert.deepEqual(state.privateCalls.map((call) => [call.mode, call.method, call.path]), [
    ["live", "POST", "/api/v3/trade/place-order"],
  ]);
});

test("approved futures access and authenticator assurance do not bypass a missing switch", async (t) => {
  withSwitch(t);
  const state = resetState();
  t.mock.method(globalThis, "fetch", (url) => {
    if (!state.allowNetwork) throw new Error(`Bitget was called while live execution was off: ${url}`);
    return Response.json({ code: "00000", data: [{ symbol: "NVDAUSDT", category: "USDT-FUTURES", status: "online", maxLeverage: "100", sizeMultiplier: "0.01", minOrderAmount: "0.01" }] });
  });
  const body = { symbol: "NVDAUSDT", action: "open_long", margin: 20, leverage: 10, confirmation: "PLACE LIVE FUTURES ORDER" };
  const denied = await futures.POST(post("/api/futures/live-order", body));
  assert.equal(denied.status, 403);
  assert.deepEqual(await denied.json(), { error: LIVE_ORDER_DISABLED_MESSAGE });
  assert.equal(state.credentialReads, 0);
  assert.equal(state.mfaChecks, 0);
  assert.equal(state.privateCalls.length, 0);
  assert.equal(state.events[0].values.metadata.blocked, true);
  assert.equal(state.events[0].values.metadata.reason, "live_execution_disabled");
  assert.equal(state.events[0].values.metadata.product, "USDT-FUTURES");
  assert.equal(state.events[0].values.metadata.symbol, "NVDAUSDT");
  assert.equal(state.events[0].values.metadata.action, "open_long");

  process.env.TIDELIGHT_LIVE_ORDER_EXECUTION_ENABLED = "true";
  state.allowNetwork = true;
  state.privateCalls = [];
  state.events = [];
  const allowed = await futures.POST(post("/api/futures/live-order", body));
  const allowedBody = await allowed.json();
  assert.equal(allowed.status, 200, JSON.stringify(allowedBody));
  assert.equal(state.mfaChecks, 1);
  assert.ok(state.privateCalls.some((call) => call.mode === "live" && call.method === "POST" && call.path === "/api/v3/trade/place-order"));
});

test("a signed-out caller is denied before an audit row or an exchange call", async (t) => {
  withSwitch(t);
  const state = resetState({ user: null });
  const response = await spot.POST(post("/api/bitget/order", { symbol: "RNVDAUSDT", side: "sell", orderType: "market", quantity: 1, confirmation: "PLACE LIVE ORDER" }));
  assert.equal(response.status, 401);
  assert.equal(state.events.length, 0);
  assert.equal(state.privateCalls.length, 0);
});

test("demo spot orders are intended to reach Bitget while the live switch is off", async (t) => {
  withSwitch(t);
  const state = resetState({ credentials: { apiKey: "demo-key", apiSecret: "demo-secret", passphrase: "demo-pass", mode: "demo" } });
  const response = await spot.POST(post("/api/bitget/order", { symbol: "RNVDAUSDT", side: "sell", orderType: "market", quantity: 1, confirmation: "PLACE DEMO ORDER" }));
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.mode, "demo");
  assert.deepEqual(state.privateCalls, [{ mode: "demo", method: "POST", path: "/api/v3/trade/place-order" }]);
  assert.equal(state.events.some((event) => event.values.metadata?.blocked), false);

  let networkUrl = "";
  let paperHeader = "";
  t.mock.method(globalThis, "fetch", async (url, init) => {
    networkUrl = String(url);
    paperHeader = init.headers.paptrading;
    return Response.json({ code: "00000", data: { orderId: "demo-order" } });
  });
  const result = await bitgetPrivateRequest(state.credentials, "POST", "/api/v3/trade/place-order", { category: "SPOT", symbol: "RNVDAUSDT", side: "sell", orderType: "market", qty: "1" });
  assert.equal(result.data.orderId, "demo-order");
  assert.equal(networkUrl, "https://api.bitget.com/api/v3/trade/place-order");
  assert.equal(paperHeader, "1");
  await assert.rejects(
    () => bitgetPrivateRequest({ ...state.credentials, mode: "live" }, "POST", "/api/v3/trade/place-order", { category: "SPOT" }),
    (error) => error?.name === "LiveOrderExecutionDisabledError",
  );
  assert.equal(networkUrl, "https://api.bitget.com/api/v3/trade/place-order");
});
