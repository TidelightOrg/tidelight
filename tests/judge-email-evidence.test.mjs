import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("Judge notification evidence links both supplied Nightwatch captures", async () => {
  const evidence = JSON.parse(await readFile(new URL("public/evidence/nightwatch-email-notifications.json", root), "utf8"));
  const page = await readFile(new URL("app/judge/page.tsx", root), "utf8");
  const translations = JSON.parse(await readFile(new URL("app/i18n/zh-CN.json", root), "utf8"));
  const readme = await readFile(new URL("README.md", root), "utf8");

  assert.equal(evidence.notifications.length, 2);
  for (const item of evidence.notifications) {
    await access(new URL(`public${item.screenshot_uri}`, root));
    assert.ok(page.includes(item.screenshot_uri), `Judge page should link ${item.id}`);
    assert.ok(readme.includes(`https://tidelight.app${item.screenshot_uri}`), `README should link ${item.id}`);
  }
  assert.ok(page.includes("judge-signal-art"), "Judge page should display its evidence illustration");
  for (const key of [
    "Signal and simulated fill notifications",
    "RAAPLUSDT buy alert",
    "RAAPLUSDT paper buy filled",
    "These captures show Gmail delivery and message content. The messages are not exchange receipts or audited performance records.",
  ]) assert.equal(typeof translations[key], "string", `Missing Simplified Chinese entry for ${key}`);
});
