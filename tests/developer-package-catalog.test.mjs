import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { renderCatalogContent, loadPackageEntries } from "../scripts/generate-developer-package-catalog.mjs";

const root = new URL("../", import.meta.url);

// Node cannot directly import the generated TypeScript module; load the validated
// source entries from the same manifest reader used to produce it.
const entries = await loadPackageEntries();

test("generated directory catalog stays byte-for-byte aligned with source metadata", async () => {
  const generated = await readFile(new URL("app/developers/packages/catalog.generated.ts", root), "utf8");
  assert.equal(generated, renderCatalogContent(entries));
});

test("the directory lists each source distribution once and links its matching detail page", () => {
  assert.deepEqual(entries.map(entry => entry.id), ["sdk", "mcp", "python", "react", "cli"]);
  assert.equal(new Set(entries.map(entry => entry.source.path)).size, entries.length);
  for (const entry of entries) {
    assert.equal(entry.source.present, true);
    assert.equal(entry.display.name, entry.distribution.intendedName);
    assert.equal(entry.display.href, `/${entry.id}`);
  }
});

test("public package cards and all detail pages expose live registry facts and installation links", async () => {
  const endpoint = await readFile(new URL("app/api/developers/packages/route.ts", root), "utf8");
  for (const name of ["@tidelight/sdk", "@tidelight/mcp", "@tidelight/react", "@tidelight/cli", "tidelight"]) {
    assert.ok(endpoint.includes(name), `registry endpoint includes ${name}`);
  }
  assert.match(endpoint, /registry\.npmjs\.org/);
  assert.match(endpoint, /pypi\.org\/pypi/);
  assert.match(endpoint, /integrity/);
  assert.match(endpoint, /sha256/);
  const facts = await readFile(new URL("app/developers/packages/registry-facts.tsx", root), "utf8");
  assert.match(facts, /entry\.install/);
  assert.match(facts, /entry\.url/);
  assert.match(facts, /entry\.version/);
  assert.match(facts, /ghcr\.io\/tidelightorg\/tidelight-mcp/);
  for (const id of ["sdk", "mcp", "python", "react", "cli"]) {
    assert.match(facts, new RegExp(`id: "${id}"`));
  }
});

test("Packages and ecosystem navigation work without sharing auth cookies with unrelated subdomains", async () => {
  const platformNav = await readFile(new URL("app/developers/platform-nav.tsx", root), "utf8");
  const consoleUi = await readFile(new URL("app/developers/console/ui.tsx", root), "utf8");
  const switcher = await readFile(new URL("app/developers/ecosystem-switcher.tsx", root), "utf8");
  const packageDashboard = await readFile(new URL("app/developers/packages/dashboard/page.tsx", root), "utf8");
  assert.match(platformNav, /href="https:\/\/package\.tidelight\.app"/);
  assert.match(platformNav, /EcosystemSwitcher current=/);
  assert.match(consoleUi, /href="https:\/\/package\.tidelight\.app">Packages/);
  assert.match(consoleUi, /EcosystemSwitcher current="intelligence"/);
  assert.match(consoleUi, /<Image src="\/tidelight-mark\.svg"/);
  assert.doesNotMatch(consoleUi, /tic-console-mark|∿/);
  assert.match(switcher, /https:\/\/tidelight\.app\/overview/);
  assert.match(switcher, /https:\/\/tidelight\.app\/developers\/console/);
  assert.match(switcher, /https:\/\/package\.tidelight\.app\/dashboard/);
  assert.match(packageDashboard, /PackageWorkbench/);
  const packageHome = await readFile(new URL("app/developers/packages/page.tsx", root), "utf8");
  assert.match(packageHome, /\.\/dashboard\/dashboard\.css/);
  assert.match(packageHome, /Tidelight Packages — Official integrations/);
  assert.match(switcher, /triggerRef\.current\?\.focus\(\)/);
  const authServer = await readFile(new URL("lib/supabase/server.ts", root), "utf8");
  const authBrowser = await readFile(new URL("lib/supabase/client.ts", root), "utf8");
  assert.doesNotMatch(authServer, /domain:\s*["']\.tidelight\.app/);
  assert.doesNotMatch(authBrowser, /domain:\s*["']\.tidelight\.app/);
});

test("manifest versions and published registry facts are represented separately", async () => {
  for (const entry of entries) {
    const manifestPath = entry.id === "python"
      ? new URL(`${entry.source.path}/pyproject.toml`, root)
      : new URL(`${entry.source.path}/package.json`, root);
    const manifest = await readFile(manifestPath, "utf8");
    assert.match(entry.display.versionLabel, new RegExp(entry.source.version.replaceAll(".", "\\.")));
    assert.match(manifest, new RegExp(entry.source.manifestName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    if (entry.id !== "python") {
      assert.equal(entry.source.private, true);
      assert.match(manifest, /"private"\s*:\s*true/);
    }
    assert.equal(entry.distribution.state.kind, "published");
    assert.equal(entry.distribution.state.version, entry.source.version);
    assert.match(entry.distribution.state.url, /^https:\/\//);
  }
});

test("Python distribution identity and compatibility match approved package metadata", () => {
  const python = entries.find(entry => entry.id === "python");
  assert.equal(python.source.manifestName, "tidelight");
  assert.equal(python.distribution.intendedName, "tidelight");
  assert.equal(python.distribution.state.kind, "published");
  assert.equal(python.compatibility.declaredPython, ">=3.10");
  assert.deepEqual(python.compatibility.testedPython, ["3.10", "3.12"]);
});

test("React peer range is separated from the tested React release", () => {
  const react = entries.find(entry => entry.id === "react");
  assert.equal(react.compatibility.peerDependencies.react, "^18.0.0 || ^19.0.0");
  assert.deepEqual(react.compatibility.testedReact, ["19.2.8"]);
  assert.notDeepEqual(react.compatibility.peerDependencies.react, react.compatibility.testedReact);
});

test("directory renders the generated catalog and never derives installability from source readiness", async () => {
  const page = await readFile(new URL("app/developers/packages/page.tsx", root), "utf8");
  assert.match(page, /import \{ packageCatalog \} from "\.\/catalog\.generated"/);
  assert.match(page, /packageCatalog\.map/);
  assert.doesNotMatch(page, /const packages\s*=\s*\[/);
  assert.match(page, /PackageRegistryCard/);
  assert.match(page, /refreshed from npm and PyPI/);
  assert.match(page, /Browse packages/);
  assert.doesNotMatch(page, /source ready/i);
  assert.doesNotMatch(page, /checkedAt/);
});


test("package detail compatibility copy distinguishes declared support from tested runtimes", async () => {
  const pythonPage = await readFile(new URL("app/developers/packages/python-detail.tsx", root), "utf8");
  assert.match(pythonPage, /Python CI tested<\/span><strong>3\.10 · 3\.12/);
  assert.match(pythonPage, /declares Python <code>&gt;=3\.10<\/code>/);
  const reactPage = await readFile(new URL("app/developers/packages/react-detail.tsx", root), "utf8");
  assert.match(reactPage, /PackageSourceBadges packageId="react"/);
  assert.doesNotMatch(reactPage, /React 18 &amp; 19|Version 0\.1\.0 private/);
});

test("mirror workflow runs package catalog freshness check for source and catalog changes", async () => {
  const workflow = await readFile(new URL(".github/workflows/public-mirror-check.yml", root), "utf8");
  assert.equal((workflow.match(/app\/developers\/packages\/\*\*/g) ?? []).length, 2);
  assert.equal((workflow.match(/scripts\/generate-developer-package-catalog\.mjs/g) ?? []).length, 2);
  assert.match(workflow, /run: npm run check:package-catalog/);
});


test("detail headers share generated source, release, and compatibility metadata", async () => {
  const details = [
    ["package-detail.tsx", "sdk"], ["mcp-detail.tsx", "mcp"],
    ["python-detail.tsx", "python"], ["react-detail.tsx", "react"],
    ["cli-detail.tsx", "cli"],
  ];
  for (const [file, id] of details) {
    const source = await readFile(new URL(`app/developers/packages/${file}`, root), "utf8");
    assert.match(source, new RegExp(`PackageSourceBadges packageId="${id}"`));
    assert.doesNotMatch(source, /Version 0\.1\.0 (?:private|source)/);
  }
  const badges = await readFile(new URL("app/developers/packages/package-source-badges.tsx", root), "utf8");
  assert.match(badges, /packageCatalog\.find/);
  assert.match(badges, /compatibilityLabel/);
  assert.match(badges, /Published/);
  assert.doesNotMatch(badges, /name unresolved/);
  assert.doesNotMatch(badges, /Source available|source ready/i);
});

test("package section navigation follows visible sections and exposes the current location", async () => {
  const routes = ["package-detail.tsx", "mcp-detail.tsx", "python-detail.tsx", "react-detail.tsx", "cli-detail.tsx"];
  const component = await readFile(new URL("app/developers/packages/package-section-nav.tsx", root), "utf8");
  for (const file of routes) {
    const source = await readFile(new URL(`app/developers/packages/${file}`, root), "utf8");
    assert.match(source, /<PackageSectionNav sections=\{/);
    const key = file === "package-detail.tsx" ? "sdk" : file.replace("-detail.tsx", "");
    const sectionList = component.match(new RegExp(`${key}: \\[([\\s\\S]*?)\\n  \\]`))?.[1];
    assert.ok(sectionList, `${file} should have a package section map`);
    const ids = [...sectionList.matchAll(/id: "([^"]+)", label:/g)].map(match => match[1]);
    assert.ok(ids.length >= 5, `${file} should expose its package sections`);
    for (const id of ids) assert.match(source, new RegExp(`<section id=["']${id}["']`), `${file} links to missing #${id}`);
  }
  assert.match(component, /new IntersectionObserver/);
  assert.match(component, /aria-current=\{ids\[index\] === activeSection \? "location" : undefined\}/);
  assert.match(component, /hashchange/);
  const css = await readFile(new URL("app/developers/packages/packages.css", root), "utf8");
  assert.match(css, /tic-package-detail-nav>a\[aria-current="location"\]/);
});

test("package detail clipping preserves sticky section navigation", async () => {
  const css = await readFile(new URL("app/developers/packages/packages.css", root), "utf8");
  assert.match(css, /tic-package-detail-page\{max-width:none;overflow:clip\}/);
});
