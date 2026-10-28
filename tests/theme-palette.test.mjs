import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Light and Dark palettes support automatic and device preferences", async () => {
  const provider = await readFile(new URL("../app/ui/theme-provider.tsx", import.meta.url), "utf8");
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(provider, /export type Theme = "dark" \| "white"/);
  assert.match(provider, /const DEFAULT_THEME: Theme = "dark"/);
  assert.match(provider, /id: "dark", name: "Dark"/);
  assert.match(provider, /id: "white", name: "White"/);
  assert.match(provider, /id: "auto", label: "Automatic"/);
  assert.match(provider, /id: "device", label: "Device"/);
  assert.match(provider, /name: "sun"/);
  assert.match(provider, /name: "device"/);
  assert.match(provider, /name: "moon"/);
  assert.match(provider, /value === "white" \|\| value === "dark"/);
  assert.match(layout, /savedTheme === "white" \|\| savedTheme === "dark"\) \? savedTheme : "dark"/);
  assert.match(css, /\.theme-picker\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /:root\[data-theme="white"\]\{color-scheme:light/);
  assert.match(css, /:root\[data-theme="dark"\]\{color-scheme:dark/);
});

test("P&L cards only expose and render Dark and White palettes", async () => {
  const card = await readFile(new URL("../app/ui/pnl-share-card.tsx", import.meta.url), "utf8");
  assert.match(card, /\{ id: "dark", label: "Dark" \}/);
  assert.match(card, /\{ id: "white", label: "White" \}/);
  assert.match(card, /const \[theme, setTheme\] = useState<Theme>\("dark"\)/);
  assert.doesNotMatch(card, /^  (?:daylight|night|blue): \{/m);
});

test("public research replays render in the White and Dark palettes", async () => {
  const replay = await readFile(new URL("../app/replay/[token]/shared-replay.css", import.meta.url), "utf8");
  assert.match(replay, /:root\[data-theme="white"\] \.shared-replay-page\{background:#fff/);
  assert.match(replay, /:root\[data-theme="dark"\] \.shared-replay-page\{background:#090a0c/);
});

test("package secondary actions retain readable contrast in White theme", async () => {
  const css = await readFile(new URL("../app/developers/packages/package-clarity.css", import.meta.url), "utf8");
  assert.match(css, /:root\[data-theme="white"\] \.tic-packages-page a\.tic-button:not\(\.tic-primary\)/);
  assert.match(css, /background-color: #fff !important;/);
  assert.match(css, /color: #17221e !important;/);
  assert.match(css, /border-color: #dfe5e2 !important;/);
});
