import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const source = await readFile(new URL("../app/ui/futures-trading-station.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(`${source}\nexport { PaperExecutionEstimate };`, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
const renderedModule = { exports: {} };
const load = name => name === "@/lib/execution-feasibility" ? require("../lib/execution-feasibility.ts") : name.startsWith("@/") || name === "next/navigation" ? {} : require(name);
new Function("require", "module", "exports", compiled)(load, renderedModule, renderedModule.exports);
const { PaperExecutionEstimate } = renderedModule.exports;
const book = { asks: [{ price: 101, size: 2 }], bids: [{ price: 99, size: 2 }], timestamp: 20_000, receivedAt: 20_000, processingMs: 0 };
const props = { action: "open_long", quantity: 1, direction: null, symbol: "NVDAUSDT", market: { market: { symbol: "NVDAUSDT" }, funding: { rate: 0.001, nextUpdate: 30_000 }, orderbook: book }, clientRequestStartedAt: 50_000, now: 51_000, chinese: false };
const render = overrides => renderToStaticMarkup(React.createElement(PaperExecutionEstimate, { ...props, ...overrides }));
const withBook = overrides => ({ ...props.market, orderbook: { ...book, ...overrides } });

test("funding uses only a fresh valid book with the sweep's age and skew limits", () => {
  assert.match(render({}), /Pays \$0\.10 · 0\.1000% · if held at settlement/);
  for (const timestamp of [null, 5_999, 25_001]) {
    assert.match(render({ market: withBook({ timestamp }) }), /Unavailable · fresh funding rate required/);
  }
  assert.match(render({ market: withBook({ timestamp: 6_000 }) }), /Pays \$0\.10/);
  assert.match(render({ market: withBook({ timestamp: 25_000 }) }), /Pays \$0\.10/);
  assert.match(render({ market: withBook({ bids: [{ price: 102, size: 1 }] }) }), /Unavailable · fresh funding rate required/);
});

test("funding uses server settlement time and client rate age, with localized holding condition", () => {
  assert.match(render({ market: { ...props.market, funding: { rate: 0.001, nextUpdate: 21_000 } } }), /Unavailable · fresh funding rate required/);
  assert.match(render({ market: { ...props.market, funding: null } }), /Unavailable · fresh funding rate required/);
  assert.match(render({ now: 65_001, market: withBook({ timestamp: 35_000, receivedAt: 35_000, processingMs: 16_000 }) }), /Unavailable · fresh funding rate required/);
  assert.match(render({ action: "open_short", chinese: true }), /收取 \$0\.10 · 0\.1000% · 结算时持仓/);
  assert.match(render({ market: { ...props.market, funding: { rate: 0, nextUpdate: 30_000 } } }), /About \$0\.00 · 0\.0000% · if held at settlement/);
});
