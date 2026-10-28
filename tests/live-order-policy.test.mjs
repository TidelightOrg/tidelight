import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { isLiveOrderExecutionEnabled } from "../lib/live-order-policy.ts";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("live exchange execution is opt-in and defaults closed", () => {
  assert.equal(isLiveOrderExecutionEnabled({}), false);
  assert.equal(isLiveOrderExecutionEnabled({ TIDELIGHT_LIVE_ORDER_EXECUTION_ENABLED: "false" }), false);
  assert.equal(isLiveOrderExecutionEnabled({ TIDELIGHT_LIVE_ORDER_EXECUTION_ENABLED: "TRUE" }), false);
  assert.equal(isLiveOrderExecutionEnabled({ TIDELIGHT_LIVE_ORDER_EXECUTION_ENABLED: "true" }), true);
});

test("spot live orders, live credential setup, and futures live requests fail closed before exchange effects", async () => {
  const [spotOrder, connection, futuresOrder, access, liveAccount] = await Promise.all([
    source("../app/api/bitget/order/route.ts"),
    source("../app/api/bitget/connection/route.ts"),
    source("../app/api/futures/live-order/route.ts"),
    source("../app/api/futures/live-access/route.ts"),
    source("../app/api/futures/live-account/route.ts"),
  ]);
  assert.match(spotOrder, /credentials\.mode === "live" && !isLiveOrderExecutionEnabled\(\)/);
  assert.ok(spotOrder.indexOf("!isLiveOrderExecutionEnabled()") < spotOrder.indexOf('bitgetPrivateRequest(credentials, "POST", "/api/v3/trade/place-order"'));
  assert.match(connection, /mode === "live" && !isLiveOrderExecutionEnabled\(\)/);
  assert.ok(connection.indexOf("mode === \"live\" && !isLiveOrderExecutionEnabled()") < connection.indexOf('bitgetPrivateRequest({ apiKey, apiSecret, passphrase, mode }, "GET"'));
  assert.ok(futuresOrder.indexOf("if(!isLiveOrderExecutionEnabled())") < futuresOrder.indexOf('bitgetPrivateRequest(credentials,"POST","/api/v3/trade/place-order"'));
  assert.ok(access.indexOf("if (!isLiveOrderExecutionEnabled())") < access.indexOf('bitgetPrivateRequest(credentials, "GET", "/api/v3/account/assets?category=USDT-FUTURES")'));
  assert.ok(liveAccount.indexOf("if (!isLiveOrderExecutionEnabled())") < liveAccount.indexOf('bitgetPrivateRequest(credentials,"GET","/api/v3/account/assets")'));
});

test("paper and demo order handlers stay independent of the live-execution gate", async () => {
  const [spotOrder, futuresPaper] = await Promise.all([
    source("../app/api/bitget/order/route.ts"),
    source("../app/api/futures/paper/route.ts"),
  ]);
  assert.match(spotOrder, /credentials\.mode === "live" && !isLiveOrderExecutionEnabled\(\)/);
  assert.doesNotMatch(futuresPaper, /isLiveOrderExecutionEnabled/);
});

test("trading pages disclose the disabled state and remove live entry controls", async () => {
  const [spotPage, spotUi, futuresPage, futuresUi] = await Promise.all([
    source("../app/trading/page.tsx"),
    source("../app/ui/trading-workspace.tsx"),
    source("../app/futures/page.tsx"),
    source("../app/ui/futures-trading-station.tsx"),
  ]);
  assert.match(spotPage, /liveOrdersEnabled=\{isLiveOrderExecutionEnabled\(\)\}/);
  assert.match(spotUi, /Live exchange orders are disabled across this deployment/);
  assert.match(spotUi, /disabled=\{!liveOrdersEnabled\}/);
  assert.match(futuresPage, /liveOrdersEnabled=\{isLiveOrderExecutionEnabled\(\)\}/);
  assert.match(futuresUi, /disabled=\{!liveOrdersEnabled\}/);
  assert.match(futuresUi, /Live access requests and real Bitget orders are blocked server-side/);
});
