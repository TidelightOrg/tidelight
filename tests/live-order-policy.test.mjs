import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isLiveOrderExecutionEnabled, liveExchangeWriteRefused } from "../lib/live-order-policy.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("live exchange execution is opt-in and defaults closed", () => {
  assert.equal(isLiveOrderExecutionEnabled({}), false);
  assert.equal(isLiveOrderExecutionEnabled({ TIDELIGHT_LIVE_ORDER_EXECUTION_ENABLED: "false" }), false);
  assert.equal(isLiveOrderExecutionEnabled({ TIDELIGHT_LIVE_ORDER_EXECUTION_ENABLED: "TRUE" }), false);
  assert.equal(isLiveOrderExecutionEnabled({ TIDELIGHT_LIVE_ORDER_EXECUTION_ENABLED: "true" }), true);
  assert.equal(liveExchangeWriteRefused("live", "POST", "/api/v3/trade/place-order", {}), true);
  assert.equal(liveExchangeWriteRefused("live", "POST", "/api/v2/spot/trade/place-order", { TIDELIGHT_LIVE_ORDER_EXECUTION_ENABLED: "TRUE" }), true);
  assert.equal(liveExchangeWriteRefused("live", "POST", "/api/v3/account/set-leverage", {}), true);
  assert.equal(liveExchangeWriteRefused("live", "GET", "/api/v3/trade/unfilled-orders?category=SPOT", {}), false);
  assert.equal(liveExchangeWriteRefused("demo", "POST", "/api/v3/trade/place-order", {}), false);
  assert.equal(liveExchangeWriteRefused("live", "POST", "/api/v3/trade/place-order", { TIDELIGHT_LIVE_ORDER_EXECUTION_ENABLED: "true" }), false);
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

test("the private client applies the same switch before any Bitget write, and demo orders stay outside it", async () => {
  const [policy, client] = await Promise.all([
    source("../lib/live-order-policy.ts"),
    source("../lib/bitget-private.ts"),
  ]);
  assert.match(policy, /Demo mode is never refused here/);
  assert.match(policy, /if \(mode !== "live"\) return false/);
  assert.ok(client.indexOf("liveExchangeWriteRefused") < client.indexOf("fetch(url"));
  assert.match(client, /credentials\.mode === "demo" \? \{ paptrading: "1" \}/);
});

async function sourceFiles(relativeDir) {
  const directory = path.join(root, relativeDir);
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = path.join(relativeDir, entry.name);
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".next") continue;
    if (entry.isDirectory()) files.push(...await sourceFiles(relative));
    else if (/\.(ts|tsx|js|mjs|py)$/.test(entry.name)) files.push(relative);
  }
  return files;
}

test("REST v1, MCP, Nightwatch, cron, webhooks, and server actions do not place Bitget orders", async () => {
  const relatives = [
    ...await sourceFiles("app/api/v1"),
    ...await sourceFiles("app/api/mcp"),
    ...await sourceFiles("app/api/cron"),
    ...await sourceFiles("app/api/nightwatch"),
    ...await sourceFiles("app/api/futures/paper"),
    ...await sourceFiles("app/api/futures/manual"),
    ...await sourceFiles("app/api/futures/orders"),
    ...await sourceFiles("public/components/mcp"),
    ...await sourceFiles("sdk"),
    "app/actions.ts",
    "app/monitor/actions.ts",
  ];
  for (const relative of relatives) {
    const text = await readFile(path.join(root, relative), "utf8");
    assert.doesNotMatch(text, /bitgetPrivateRequest|place-order|placeOrder/, `${relative} must not place a Bitget order`);
  }
  const privateCallers = [];
  async function findCallers(relativeDir) {
    for (const relative of await sourceFiles(relativeDir)) {
      if (relative === "lib/bitget-private.ts") continue;
      const text = await readFile(path.join(root, relative), "utf8");
      if (text.includes("bitgetPrivateRequest")) privateCallers.push({ relative, text });
    }
  }
  await findCallers("app");
  await findCallers("lib");
  assert.deepEqual(privateCallers.map((caller) => caller.relative).sort(), [
    "app/api/bitget/connection/route.ts",
    "app/api/bitget/order/route.ts",
    "app/api/futures/live-access/route.ts",
    "app/api/futures/live-account/route.ts",
    "app/api/futures/live-order/route.ts",
  ]);
  for (const caller of privateCallers) {
    assert.match(caller.text, /isLiveOrderExecutionEnabled/, `${caller.relative} must use the existing live-order switch`);
  }
});
