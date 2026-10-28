import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("new visits choose a palette from the browser time zone unless a preference is saved", async () => {
  const provider = await readFile(new URL("../app/ui/theme-provider.tsx", import.meta.url), "utf8");
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(provider, /export type ThemeMode = "auto" \| "device" \| "manual"/);
  assert.match(provider, /automaticTheme\(cookieValue\("tidelight-timezone"\) \|\| getTimeZone\(\)\)/);
  assert.match(provider, /window\.matchMedia\?\.\("\(prefers-color-scheme: light\)"\)/);
  assert.match(layout, /automaticTheme\(timeZone\)/);
  assert.match(layout, /themeMode === "manual" && validTheme\(savedTheme\)/);
});
