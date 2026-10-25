import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("workspace shell does not prefetch authenticated destinations from navigation chrome", async () => {
  const shell = await readFile(new URL("../app/ui/workspace-shell.tsx", import.meta.url), "utf8");
  assert.ok(shell.includes("href={item.href} prefetch={false} key={item.href}"));
  assert.ok(shell.includes("href={item.href} prefetch={false} className={`mobile-nav-link"));
  assert.ok(shell.includes("href={item.href} prefetch={false} onClick={() => setMobileMenuPath(null)}"));
  assert.ok(shell.includes("href={email ? \"/account\" : \"/login\"} prefetch={false}"));
  assert.ok(shell.includes("href=\"/account\" prefetch={false}>ACCOUNT"));
});
