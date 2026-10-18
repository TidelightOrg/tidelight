#!/usr/bin/env node
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stageNpmReleasePackage } from "./prepare-npm-package-release.mjs";

const mirrorPackages = new Map([
  ["sdk/typescript", "@tidelightorg/sdk"],
  ["public/components/mcp/server", "@tidelightorg/mcp"],
  ["packages/react", "@tidelightorg/react"],
  ["packages/cli", "@tidelightorg/cli"],
]);
const registry = "https://npm.pkg.github.com";

async function rewriteBundleReferences(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) await rewriteBundleReferences(target);
    else if (/\.(?:js|mjs|cjs|d\.ts|md)$/.test(entry.name)) {
      const content = await readFile(target, "utf8");
      await writeFile(target, content.replaceAll("@tidelight/sdk", "@tidelightorg/sdk"));
    }
  }
}

export async function prepareGitHubNpmMirror(source, output, root = process.cwd()) {
  const name = mirrorPackages.get(source);
  if (!name) throw new Error("Unsupported GitHub npm mirror source: " + source);
  const result = await stageNpmReleasePackage(source, output, root);
  const manifestPath = path.join(output, "package.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const originalName = manifest.name;
  manifest.name = name;
  manifest.publishConfig = { ...(manifest.publishConfig ?? {}), registry };

  if (source === "packages/cli") {
    manifest.dependencies["@tidelightorg/sdk"] = manifest.dependencies["@tidelight/sdk"];
    delete manifest.dependencies["@tidelight/sdk"];
  }
  if (source === "packages/react") {
    manifest.peerDependencies["@tidelightorg/sdk"] = manifest.peerDependencies["@tidelight/sdk"];
    delete manifest.peerDependencies["@tidelight/sdk"];
  }
  await rewriteBundleReferences(path.join(output, "dist"));

  const readmePath = path.join(output, "README.md");
  let readme = await readFile(readmePath, "utf8");
  readme = readme
    .replaceAll("@tidelight/sdk", "@tidelightorg/sdk")
    .replaceAll("@tidelight/mcp", "@tidelightorg/mcp")
    .replaceAll("@tidelight/react", "@tidelightorg/react")
    .replaceAll("@tidelight/cli", "@tidelightorg/cli");
  const registryNote = [
    "# GitHub Packages mirror",
    "",
    "This is the GitHub Packages distribution of the official " + originalName + " package. Its canonical npmjs.org distribution remains " + originalName + ".",
    "",
    "GitHub Packages requires a GitHub personal access token (classic) with read:packages for installs. Add this to your project .npmrc and provide the token through your environment:",
    "",
    "    @tidelightorg:registry=https://npm.pkg.github.com",
    "    //npm.pkg.github.com/:_authToken=" + "$" + "{GITHUB_PACKAGES_TOKEN}",
    "",
    "---",
    "",
  ].join("\n");
  await writeFile(readmePath, registryNote + readme);
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  return { ...result, name, manifest };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [source, output] = process.argv.slice(2);
  if (!source || !output) throw new Error("Usage: node scripts/prepare-github-npm-mirror.mjs <package-source> <output-directory>");
  prepareGitHubNpmMirror(source, output)
    .then(result => console.log("Prepared " + result.name + "@" + result.manifest.version + " for GitHub Packages; source remains " + result.source + "."))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
