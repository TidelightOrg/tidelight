import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("new visits follow local time and saved preferences can use device or manual themes", async () => {
  const provider = await readFile(new URL("../app/ui/theme-provider.tsx", import.meta.url), "utf8");
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.ok(provider.includes('export type ThemeMode = "auto" | "device" | "manual"'));
  assert.ok(provider.includes("automaticTheme(getTimeZone())"));
  assert.ok(provider.includes('window.matchMedia?.("(prefers-color-scheme: light)")'));
  assert.ok(layout.includes("automaticTheme(timeZone)"));
  assert.ok(layout.includes('themeMode === "manual" && validTheme(savedTheme)'));
});
