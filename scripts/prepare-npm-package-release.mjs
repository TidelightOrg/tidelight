#!/usr/bin/env node
import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageSources = new Set([
  "sdk/typescript",
  "packages/react",
  "packages/cli",
  "public/components/mcp/server",
]);

function fail(message) {
  throw new Error(`npm release staging failed: ${message}`);
}

export async function stageNpmReleasePackage(sourceDirectory, outputDirectory, rootDirectory) {
  const root = path.resolve(rootDirectory);
  const source = path.relative(root, path.resolve(sourceDirectory)).split(path.sep).join("/");
  if (!packageSources.has(source)) fail(`unsupported package source ${source || "(empty)"}.`);

  const sourceRoot = path.join(root, source);
  const sdkManifest = JSON.parse(await readFile(path.join(root, "sdk/typescript/package.json"), "utf8"));
  const manifest = JSON.parse(await readFile(path.join(sourceRoot, "package.json"), "utf8"));
  if (manifest.private !== true) fail(`${source} must remain private in the source tree until first-release approval.`);
  if (manifest.license !== "Apache-2.0") fail(`${source} must declare the package-scoped Apache-2.0 license.`);
  if (!Array.isArray(manifest.files) || !manifest.files.includes("LICENSE") || !manifest.files.includes("NOTICE")) {
    fail(`${source} must explicitly include LICENSE and NOTICE in its archive allowlist.`);
  }

  const destination = path.resolve(outputDirectory);
  await rm(destination, { recursive: true, force: true });
  await mkdir(destination, { recursive: true });
  for (const entry of manifest.files) {
    if (entry.includes("*") || entry.includes("..") || path.isAbsolute(entry)) fail(`unsafe files allowlist entry ${entry}.`);
    const input = path.join(sourceRoot, entry);
    let info;
    try { info = await stat(input); } catch { fail(`${source} is missing allowlisted ${entry}.`); }
    await cp(input, path.join(destination, entry), { recursive: info.isDirectory(), dereference: false });
  }

  delete manifest.private;
  delete manifest.devDependencies;
  delete manifest.scripts;
  if (source === "packages/cli") {
    if (manifest.dependencies?.["@tidelight/sdk"] !== "file:../../sdk/typescript") {
      fail("CLI SDK dependency changed; update and review its release mapping before publishing.");
    }
    manifest.dependencies["@tidelight/sdk"] = `^${sdkManifest.version}`;
  }

  for (const group of ["dependencies", "optionalDependencies", "peerDependencies"]) {
    for (const [name, version] of Object.entries(manifest[group] ?? {})) {
      if (typeof version === "string" && version.startsWith("file:")) fail(`${source} contains unpublished local dependency ${name}.`);
    }
  }

  await writeFile(path.join(destination, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return { source, name: manifest.name, version: manifest.version, destination, manifest };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [source, destination] = process.argv.slice(2);
  if (!source || !destination) fail("usage: node scripts/prepare-npm-package-release.mjs <package-source> <output-directory>.");
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  stageNpmReleasePackage(source, destination, root)
    .then(result => console.log(`Staged ${result.name}@${result.version} from ${result.source} for archive validation. Nothing was published.`))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
