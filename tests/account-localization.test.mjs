import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("account section labels and rows translate during client render", async () => {
  const tabs = await readFile(new URL("../app/ui/account-tabs.tsx", import.meta.url), "utf8");
  const copy = await readFile(new URL("../app/ui/account-copy-button.tsx", import.meta.url), "utf8");
  const dictionary = JSON.parse(await readFile(new URL("../app/i18n/zh-CN.json", import.meta.url), "utf8"));
  assert.match(tabs, /const \{ translate \} = useLanguage\(\)/);
  assert.match(tabs, /translate\(item\.title\)/);
  assert.match(tabs, /translate\(item\.label\)/);
  assert.match(tabs, /translate\(item\.detail\)/);
  assert.match(tabs, /translate\(item\.value\)/);
  assert.match(copy, /translate\("Copy Tidelight UID"\)/);
  assert.equal(dictionary.Preference, "偏好设置");
  assert.equal(dictionary.General, "常规");
  assert.equal(dictionary["Bitget only"], "仅限 Bitget");
  assert.equal(dictionary["Tune how Tidelight presents research and sends product updates."], "调整 Tidelight 展示研究内容和发送产品更新的方式。");
  assert.equal(dictionary["Select ID to copy"], "请手动选择并复制 ID");
});

test("account chrome localizes account heading and sign-out action at render time", async () => {
  const page = await readFile(new URL("../app/account/page.tsx", import.meta.url), "utf8");
  const localized = await readFile(new URL("../app/ui/localized-text.tsx", import.meta.url), "utf8");
  assert.match(page, /<LocalizedText>TIDELIGHT ACCOUNT<\/LocalizedText>/);
  assert.match(page, /<LocalizedText>Log out<\/LocalizedText>/);
  assert.match(localized, /translate\(children\)/);
});
