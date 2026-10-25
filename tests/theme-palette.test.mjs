import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("all five themes are selectable for the current browser session", async () => {
  const provider = await readFile(new URL("../app/ui/theme-provider.tsx", import.meta.url), "utf8");
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(provider, /"daylight" \| "night" \| "blue" \| "white" \| "dark"/);
  assert.match(provider, /id: "white", name: "White"/);
  assert.match(provider, /id: "dark", name: "Dark"/);
  assert.match(provider, /value === "white" \|\| value === "dark"/);
  assert.match(provider, /document\.cookie = `tidelight-theme=\$\{preference\}; Path=\/; SameSite=Lax/);
  assert.match(provider, /localStorage\.removeItem\("tidelight-theme"\)/);
  assert.doesNotMatch(provider, /theme-quick-auto/);
  assert.doesNotMatch(provider, /theme-quick-swatch[^>]*>A/);
  assert.match(layout, /savedTheme === "white" \|\| savedTheme === "dark"/);
  assert.match(css, /:root\[data-theme="white"\]\{color-scheme:light/);
  assert.match(css, /:root\[data-theme="dark"\]\{color-scheme:dark/);
});

test("position share cards define a canvas palette for every selectable theme", async () => {
  const card = await readFile(new URL("../app/ui/pnl-share-card.tsx", import.meta.url), "utf8");
  assert.match(card, /currentTheme === "white" \|\| currentTheme === "dark"/);
  for (const theme of ["daylight", "night", "blue", "white", "dark"]) {
    assert.match(card, new RegExp(`id: "${theme}"`));
    assert.match(card, new RegExp(`^  ${theme}: \\{`, "m"));
  }
});

test("public research replays render in the White and Dark palettes", async () => {
  const replay = await readFile(new URL("../app/replay/[token]/shared-replay.css", import.meta.url), "utf8");
  assert.match(replay, /:root\[data-theme="white"\] \.shared-replay-page\{background:#fff/);
  assert.match(replay, /:root\[data-theme="dark"\] \.shared-replay-page\{background:#090a0c/);
});

test("package secondary actions retain readable contrast in light themes", async () => {
  const css = await readFile(new URL("../app/developers/packages/package-clarity.css", import.meta.url), "utf8");
  assert.match(css, /:root:is\(\[data-theme="daylight"\], \[data-theme="white"\]\) \.tic-packages-page a\.tic-button:not\(\.tic-primary\)/);
  assert.match(css, /background-color: #fff !important;/);
  assert.match(css, /color: #17221e !important;/);
  assert.match(css, /border-color: #dfe5e2 !important;/);
});
