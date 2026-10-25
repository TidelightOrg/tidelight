import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("overview and token pulse copy stay readable in desktop-site phone widths", async () => {
  const globals = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const pulse = await readFile(new URL("../app/ui/token-pulse.css", import.meta.url), "utf8");
  assert.match(globals, /@media\s*\(min-width:\s*761px\)\s*and\s*\(max-width:\s*1100px\)/);
  assert.match(globals, /\.dashboard-page \.data-disclaimer\s*\{\s*font-size:\s*12px/);
  assert.match(globals, /\.dashboard-page \.company-card > small\s*\{\s*font-size:\s*11px/);
  assert.match(globals, /\[data-theme="daylight"\].*\.dashboard-page \.text-button\s*\{\s*color:\s*#28714e/s);
  assert.doesNotMatch(globals, /\.story-tag,\s*\.method-steps span,\s*\.method-steps small/);
  assert.match(globals, /\.dashboard-page \.method-steps :is\(span, small\) \{ color: #a4b3aa; \}/);
  assert.match(pulse, /@media\s*\(min-width:\s*761px\)\s*and\s*\(max-width:\s*1100px\)/);
  assert.match(pulse, /\.tp-helper\s*,[\s\S]*?\.tp-sources a\s*\{\s*font-size:\s*13px/);
});
