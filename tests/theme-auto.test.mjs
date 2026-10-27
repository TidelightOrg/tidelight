import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("new visits use Dark rather than resolving a palette from the local clock", async () => {
  const provider = await readFile(new URL("../app/ui/theme-provider.tsx", import.meta.url), "utf8");
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(provider, /const DEFAULT_THEME: Theme = "dark"/);
  assert.doesNotMatch(provider, /automaticTheme|"auto"|daylight|Night Tide|Blue Hour/);
  assert.match(layout, /: "dark";/);
});
