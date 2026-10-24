import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { parseDocument } from "yaml";

const root = new URL("../", import.meta.url);
const translations = JSON.parse(await readFile(new URL("app/i18n/zh-CN.json", root), "utf8"));

test("Simplified Chinese preserves the Tidelight product name and covers package surfaces", () => {
  assert.equal(translations.tidelight, "Tidelight");
  assert.equal(translations.Exposure, "风险敞口");
  assert.equal(translations["Feed freshness"], "行情数据时效");
  assert.equal(translations["A current Bitget Reality price is required for this paper exit."], "模拟平仓需要最新的 Bitget Reality 行情。");
  for (const key of [
    "OFFICIAL DEVELOPER PACKAGES", "Available packages", "OFFICIAL PACKAGE / TYPESCRIPT · JAVASCRIPT",
    "Research job lifecycle", "Supported operations", "Bounded behavior, protected credentials.",
    "Open full research with source discovery", "OFFICIAL SOURCE STARTERS", "BLS · Consumer Price Index",
    "Feed freshness", "A TIDELIGHT TRADE CARD", "Exposure", "Paper portfolio summary",
  ]) assert.equal(typeof translations[key], "string", `Missing Simplified Chinese entry for ${key}`);
});

test("developer pages expose a language toggle and share the language preference across Tidelight subdomains", async () => {
  const [nav, docs, provider] = await Promise.all([
    readFile(new URL("app/developers/platform-nav.tsx", root), "utf8"),
    readFile(new URL("app/developers/docs/page.tsx", root), "utf8"),
    readFile(new URL("app/ui/language-provider.tsx", root), "utf8"),
  ]);
  assert.match(nav, /LanguageToggle className="tic-language-toggle"/);
  assert.match(docs, /LanguageToggle className="tic-language-toggle"/);
  assert.match(provider, /hostname\.endsWith\("\.tidelight\.app"\)/);
  assert.match(provider, /domain=\.tidelight\.app/);
  assert.ok(provider.indexOf("const cookieLanguage") < provider.indexOf("window.localStorage.getItem(STORAGE_KEY)"));
});

test("Simplified Chinese covers visible developer docs and package UI copy", async () => {
  const paths = [
    "app/developers/docs/page.tsx",
    "app/developers/platform-nav.tsx",
    "app/developers/ecosystem-switcher.tsx",
    "app/developers/packages/page.tsx",
    "app/developers/packages/dashboard/page.tsx",
    "app/developers/packages/package-workbench.tsx",
    "app/developers/packages/package-detail.tsx",
    "app/developers/packages/cli-detail.tsx",
    "app/developers/packages/mcp-detail.tsx",
    "app/developers/packages/python-detail.tsx",
    "app/developers/packages/react-detail.tsx",
    "app/developers/packages/package-lifecycle-demo.tsx",
    "app/developers/packages/package-section-nav.tsx",
    "app/developers/packages/registry-facts.tsx",
  ];
  const missing = new Set();
  const decodeEntities = (value) => value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
  const normalized = (value) => decodeEntities(value).replace(/\s+/g, " ").trim();
  const isIdentifier = (value) => {
    if (value.length < 2 || /^@tidelight\//.test(value)) return true;
    if (/^(?:https?:\/\/|\/|[A-Z][A-Z0-9_:-]*\/)/.test(value)) return true;
    if (/^[A-Za-z_$][A-Za-z0-9_$:./?+=<>|{}"'-]*$/.test(value) && !/\s/.test(value)) return true;
    return false;
  };

  for (const path of paths) {
    const source = await readFile(new URL(path, root), "utf8");
    const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const insideCode = (node) => {
      for (let parent = node.parent; parent; parent = parent.parent) {
        if (ts.isJsxElement(parent) && ["code", "pre", "script", "style"].includes(parent.openingElement.tagName.getText(file).toLowerCase())) return true;
        if (ts.isJsxSelfClosingElement(parent) && ["code", "pre", "script", "style"].includes(parent.tagName.getText(file).toLowerCase())) return true;
      }
      return false;
    };
    const visit = (node) => {
      if (ts.isJsxText(node) && !insideCode(node)) {
        const key = normalized(node.getText(file));
        // JSX often splits a sentence around inline <code>/<Link> children. Those
        // fragments cannot be translated in isolation and aren't user-facing labels.
        if (key.length >= 16 && /[A-Za-z]/.test(key) && !isIdentifier(key) && !translations[key]) missing.add(`${path}: ${key}`);
      }
      if (ts.isJsxAttribute(node) && ["aria-label", "alt", "title", "placeholder"].includes(node.name.getText(file)) && node.initializer && ts.isStringLiteral(node.initializer)) {
        const key = normalized(node.initializer.text);
        if (/[A-Za-z]/.test(key) && !isIdentifier(key) && !translations[key]) missing.add(`${path} [${node.name.getText(file)}]: ${key}`);
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
  }

  assert.deepEqual([...missing].sort(), [], `Missing Simplified Chinese entries:\n${[...missing].sort().join("\n")}`);
  for (const key of [
    "Build the source and authenticate.",
    "The endpoint is stateless and returns JSON responses. Use an MCP client that supports Streamable HTTP and custom Bearer authorization headers. Client interoperability is verified with the official TypeScript SDK; no named third party client is certified yet.",
    "Install the published package with the command shown above. You can also build the canonical source or link it locally.",
    "Copy unavailable",
    "Anyone with the link can view the symbol, rule, date window, reported metrics, candle archive, and assumptions. Public for 30 days; account and portfolio details are excluded.",
  ]) assert.equal(typeof translations[key], "string", `Missing translation for ${key}`);
});

test("Simplified Chinese JSON has no duplicate keys and preserves Tidelight identifiers", async () => {
  const source = await readFile(new URL("app/i18n/zh-CN.json", root), "utf8");
  const document = parseDocument(source, { uniqueKeys: true });
  assert.deepEqual(document.errors, [], "Locale JSON must have unique keys");
  const duplicateProbe = parseDocument('{"same":"one","same":"two"}', { uniqueKeys: true });
  assert.ok(duplicateProbe.errors.some((error) => error.code === "DUPLICATE_KEY"), "Duplicate-key detection must be active");
  for (const [key, value] of [
    ["Tidelight", "Tidelight"],
    ["Public strategy replay · Tidelight", "公开策略回放 · Tidelight"],
    ["TIDELIGHT PEOPLE", "TIDELIGHT PEOPLE"],
    ["TIDELIGHT ·", "TIDELIGHT ·"],
    ["tidelight.strategy-run.v1", "tidelight.strategy-run.v1"],
    ["tidelight.app", "tidelight.app"],
  ]) assert.equal(translations[key], value, `Unexpected brand or identifier translation for ${key}`);
  for (const value of Object.values(translations)) {
    if (typeof value === "string") assert.doesNotMatch(value, /潮光|潮汐灯/, "Tidelight must keep its trademark spelling");
  }
});
