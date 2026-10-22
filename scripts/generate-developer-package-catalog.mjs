#!/usr/bin/env node
import { readFile, access, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = path.join(root, "app/developers/packages/catalog.generated.ts");
const sources = [
  { id: "sdk", path: "sdk/typescript", registry: "npm", intendedName: "@tidelight/sdk", ecosystem: "TypeScript · JavaScript", summary: "Typed client for supported Tidelight API v1 endpoints, async research jobs, and webhooks.", href: "/sdk", glyph: "TS", publication: "published", registryVersion: "0.1.2", registryUrl: "https://www.npmjs.com/package/@tidelight/sdk" },
  { id: "mcp", path: "public/components/mcp/server", registry: "npm", intendedName: "@tidelight/mcp", ecosystem: "Node.js · MCP stdio", summary: "Bridge stdio-only MCP clients to Tidelight's hosted, scope-filtered Streamable HTTP service.", href: "/mcp", glyph: "M", publication: "published", registryVersion: "0.1.2", registryUrl: "https://www.npmjs.com/package/@tidelight/mcp" },
  { id: "python", path: "sdk/python", registry: "pypi", intendedName: "tidelight", ecosystem: "Python SDK", summary: "Python client for supported market, research-job, and webhook workflows.", href: "/python", glyph: "Py", publication: "published", registryVersion: "0.1.2", registryUrl: "https://pypi.org/project/tidelight/" },
  { id: "react", path: "packages/react", registry: "npm", intendedName: "@tidelight/react", ecosystem: "React · hooks & UI", summary: "Typed hooks and accessible market components backed by the official SDK contract.", href: "/react", glyph: "R", publication: "published", registryVersion: "0.1.2", registryUrl: "https://www.npmjs.com/package/@tidelight/react" },
  { id: "cli", path: "packages/cli", registry: "npm", intendedName: "@tidelight/cli", ecosystem: "Node.js · command line", summary: "Keychain-backed terminal workflows for supported market, research-job, and webhook API operations.", href: "/cli", glyph: "$", publication: "published", registryVersion: "0.1.2", registryUrl: "https://www.npmjs.com/package/@tidelight/cli" },
];

async function exists(file) {
  try { await access(file); return true; } catch { return false; }
}

function parsePythonProject(source) {
  const project = source.match(/^\[project\]\s*\n([\s\S]*?)(?=^\[)/m)?.[1];
  if (!project) throw new Error("sdk/python/pyproject.toml is missing [project].");
  const field = (name) => project.match(new RegExp(`^${name}\\s*=\\s*["']([^"']+)["']`, "m"))?.[1];
  const name = field("name");
  const version = field("version");
  const requiresPython = field("requires-python");
  if (!name || !version || !requiresPython) throw new Error("Python package metadata must declare name, version, and requires-python.");
  return { name, version, requiresPython };
}

function quote(value) {
  return JSON.stringify(value);
}

export async function loadPackageEntries() {
  const workflow = await readFile(path.join(root, ".github/workflows/public-mirror-check.yml"), "utf8");
  const nodeVersion = workflow.match(/^\s*node-version:\s*["']?(\d+)/m)?.[1];
  const pythonVersionsText = workflow.match(/^\s*python-version:\s*\[([^\]]+)\]/m)?.[1];
  const testedPython = pythonVersionsText?.match(/["'](\d+\.\d+)["']/g)?.map(value => value.replace(/["']/g, "")) ?? [];
  if (!nodeVersion || testedPython.length < 2) throw new Error("Package validation workflow must declare the Node and Python compatibility matrix.");

  const entries = [];
  for (const definition of sources) {
    const packageDirectory = path.join(root, definition.path);
    if (!(await exists(packageDirectory))) throw new Error(`Package source directory is missing: ${definition.path}`);
    const isPython = definition.registry === "pypi";
    const manifest = isPython
      ? parsePythonProject(await readFile(path.join(packageDirectory, "pyproject.toml"), "utf8"))
      : JSON.parse(await readFile(path.join(packageDirectory, "package.json"), "utf8"));
    const available = await exists(path.join(packageDirectory, isPython ? "pyproject.toml" : "package.json"));
    if (!available) throw new Error(`Package manifest is missing: ${definition.path}`);
    if (!isPython && manifest.private !== true) throw new Error(`${definition.path}/package.json must remain private until a reviewed registry release exists.`);

    const registryState = { kind: definition.publication, version: definition.registryVersion, url: definition.registryUrl };
    const compatibility = isPython
      ? { declaredPython: manifest.requiresPython, testedPython }
      : {
          declaredNode: manifest.engines?.node ?? null,
          testedNode: [`${nodeVersion}.x`],
          peerDependencies: manifest.peerDependencies ?? {},
          testedReact: manifest.devDependencies?.react ? [manifest.devDependencies.react] : [],
        };
    const versionLabel = `Registry: ${definition.registryVersion} · source manifest: ${manifest.version}`;
    entries.push({
      id: definition.id,
      source: { path: definition.path, manifestName: manifest.name, version: manifest.version, private: isPython ? null : manifest.private, present: available },
      distribution: { registry: definition.registry, intendedName: definition.intendedName, state: registryState },
      compatibility,
      display: {
        name: definition.intendedName,
        ecosystem: definition.ecosystem,
        summary: definition.summary,
        stateLabel: `${definition.registry} · published ${definition.registryVersion}`,
        versionLabel,
        href: definition.href,
        glyph: definition.glyph,
      },
    });
  }

  return entries;
}

export function renderCatalogContent(entries) {
  return `/* Generated by scripts/generate-developer-package-catalog.mjs. Do not edit by hand. */\nexport type PackageId = ${sources.map(item => quote(item.id)).join(" | ")};\nexport type RegistryState = { kind: "published"; version: string; url: string };\nexport type DeveloperPackage = {\n  id: PackageId;\n  source: { path: string; manifestName: string; version: string; private: boolean | null; present: boolean };\n  distribution: { registry: "npm" | "pypi"; intendedName: string; state: RegistryState };\n  compatibility: { declaredNode?: string | null; testedNode?: string[]; declaredPython?: string | null; testedPython?: string[]; peerDependencies?: Record<string, string>; testedReact?: string[] };\n  display: { name: string; ecosystem: string; summary: string; stateLabel: string; versionLabel: string; href: string; glyph: string };\n};\nexport const packageCatalog = ${JSON.stringify(entries, null, 2)} as const satisfies readonly DeveloperPackage[];\n`;
}

async function main() {
  const entries = await loadPackageEntries();
  const content = renderCatalogContent(entries);
  if (process.argv.includes("--check")) {
    const existing = await readFile(outputPath, "utf8").catch(() => "");
    if (existing !== content) throw new Error("Package catalog is stale. Run `node scripts/generate-developer-package-catalog.mjs` and review the change.");
    console.log("Developer package catalog matches package manifests and CI compatibility declarations.");
    return;
  }
  await writeFile(outputPath, content);
  console.log(`Updated ${path.relative(root, outputPath)} from package source metadata.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
