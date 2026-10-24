import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { parseDocument } from "yaml";
import { localizeResearchSuggestion } from "../lib/research-question-localization.ts";

const root = new URL("../", import.meta.url);
const translations = JSON.parse(await readFile(new URL("app/i18n/zh-CN.json", root), "utf8"));

test("Simplified Chinese preserves the Tidelight product name and covers package surfaces", () => {
  assert.equal(translations.tidelight, "Tidelight");
  assert.equal(translations.Exposure, "风险敞口");
  assert.equal(translations["Feed freshness"], "行情数据时效");
  assert.equal(translations["A current Bitget Reality price is required for this paper exit."], "模拟平仓需要最新的 Bitget Reality 行情。");
  assert.equal(translations["and"], "以及");
  assert.equal(translations["and a"], "响应和一个");
  assert.equal(translations[". Poll"], "。请通过");
  assert.equal(translations["Only"], "仅");
  for (const key of [
    "OFFICIAL DEVELOPER PACKAGES", "Available packages", "OFFICIAL PACKAGE / TYPESCRIPT · JAVASCRIPT",
    "Research job lifecycle", "Supported operations", "Bounded behavior, protected credentials.",
    "Open full research with source discovery", "OFFICIAL SOURCE STARTERS", "BLS · Consumer Price Index",
    "Feed freshness", "A TIDELIGHT TRADE CARD", "Exposure", "Paper portfolio summary",
    "Bring a question about a company, its tokenized market, or a dated Fed/BLS release. Tidelight separates issuer news from instrument-specific evidence, checks market context, and explains what the research can—and cannot—support.",
    "FEDERAL RESERVE / BLS SOURCES", "Macro measurements, official decisions, and market interpretation are kept separate. This is not a policy forecast.",
    "Official source", "Independent reporting", "No instrument or trading decision is generated.",
  ]) assert.equal(typeof translations[key], "string", `Missing Simplified Chinese entry for ${key}`);
});

test("macro research prompt and result terminology have Simplified Chinese coverage", async () => {
  const desk = await readFile(new URL("app/ui/agent-flow-desk.tsx", root), "utf8");
  const prompt = "Bring a question about a company, its tokenized market, or a dated Fed/BLS release. Tidelight separates issuer news from instrument-specific evidence, checks market context, and explains what the research can—and cannot—support.";
  const placeholder = "Ask about a company, tokenized market, or dated Fed/BLS release…";
  const deskControls = ["Research ↗", "Research question", "Suggested questions", "Shared replays", "What changed for NVDA since the latest evidence?", "What are the key risks around NVDA right now?", "Review recent evidence and market context for NVDA"];
  assert.ok(desk.includes(prompt), "Research page should advertise dated Fed/BLS questions");
  assert.ok(desk.includes(placeholder), "Research prompt should guide macro questions");
  for (const key of [prompt, placeholder, "FEDERAL RESERVE / BLS SOURCES", "Official source", "Independent reporting", "No instrument or trading decision is generated.", ...deskControls]) {
    assert.equal(typeof translations[key], "string", `Missing Simplified Chinese entry for ${key}`);
  }
});

test("dynamic stock suggestions localize ticker templates while preserving English research queries", () => {
  const cases = [
    ["What changed for TSLA since the latest evidence?", "自最新证据以来，TSLA 有哪些变化？"],
    ["What are the key risks around AAPL right now?", "目前 AAPL 面临哪些主要风险？"],
    ["Review recent evidence and market context for MSFT", "查看 MSFT 的近期证据和市场背景"],
    ["Is the rNVDA market supported by current evidence?", "当前证据是否支持 rNVDA 市场？"],
  ];
  for (const [source, expected] of cases) {
    assert.equal(localizeResearchSuggestion(source, "zh-CN"), expected);
    assert.equal(localizeResearchSuggestion(source, "en"), source);
  }
  assert.equal(localizeResearchSuggestion("A user-written research question", "zh-CN"), "A user-written research question");
});

test("Simplified Chinese covers the Judge evaluation path and public evidence disclosures", () => {
  for (const key of [
    "AI TRADING DESK · PUBLIC EVALUATION", "Inspect the decision.",
    "Trace an after-hours market question through its sources, tokenized instrument context, scenarios, and risk gates.",
    "Risk gate", "Research is reviewable. Actions remain paper-only and user-controlled.",
    "Start with a question, not a prediction.", "Check the evidence", "Inspect sources, timestamps, claims, and counterpoints.",
    "Map the market", "Review instrument, quote freshness, and session context.", "Review the gate", "See why a paper action is allowed or blocked.",
    "PUBLIC RESEARCH", "Five snapshots used source-only fallback when AI synthesis was unavailable. None produced a directional assessment or trade handoff.",
    "Quotes describe capture-time freshness. These records do not measure token depth, spread, or premium/discount. Published links can be revoked or expire.",
    "Test the rule on unseen data.", "Review holdout periods, costs, candle fingerprints, drawdown, and trade logs. The report links to the assumptions needed to reproduce a run.",
    "Recorded positions", "NIGHTWATCH · HISTORICAL PAPER CAPTURES", "Simulated marks captured 12–22 October 2026. This exhibit is not a live account query or audited performance.",
    "NIGHTWATCH · EMAIL DELIVERY", "Notification received for RNVDUSDT.",
    "Gmail received the Nightwatch analysis on 24 October 2026 at 09:00 WAT. SPF, DKIM, and DMARC passed. The message records a rejected HOLD because an existing long position was active.",
    "This verifies email delivery and rendering. It does not independently verify ledger state, an exchange order, or trading performance.",
    "Historical simulations are not audited results. Research is not investment advice; live execution is not enabled.",
    "JUDGE MODE", "Start the evaluation", "Evidence and methods", "Automotive", "AI and cloud", "Devices and services",
    "Regulation and AI search", "Cloud and retail", "40 headlines", "30 publishers", "23 publishers", "22 publishers",
    "17 publishers", "21 publishers", "quote stale", "quote fresh at capture", "no trade handoff", "Open the evidence manifest",
    "Evidence manifest", "Capture data", "Delivery record", "Open Gmail capture",
    "Open the full Gmail screenshot for the RNVDUSDT Nightwatch email", "Browse published paper replays", "Download JSON",
    "PUBLIC REPLAY", "after costs", "Holdout return trailed buy and hold (+2.12%) over 32 days. Historical simulation; costs estimated, no live orders.",
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

test("ecosystem READMEs link complete Simplified Chinese companions", async () => {
  for (const path of [
    "docs/packages/README.md",
    "production/tidelight-hackathon-cinematic-demo/README.md",
    "public/components/mcp/server/README.md",
    "public/evidence/README.md",
  ]) {
    const english = await readFile(new URL(path, root), "utf8");
    const chinesePath = path.replace(/README\.md$/, "README.zh-CN.md");
    const chinese = await readFile(new URL(chinesePath, root), "utf8");
    assert.match(english, /README\.zh-CN\.md/, `${path} must link its Chinese companion`);
    assert.match(chinese, /English version: \[README\.md\]\(README\.md\)/, `${chinesePath} must link back to English`);
    assert.ok(chinese.includes("Tidelight"), `${chinesePath} must preserve the product name`);
  }
});
