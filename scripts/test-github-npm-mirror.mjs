#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { prepareGitHubNpmMirror } from "./prepare-github-npm-mirror.mjs";

const root = process.cwd();
const output = await mkdtemp(path.join(os.tmpdir(), "tidelight-github-npm-mirror-"));
const sources = [
  ["sdk/typescript", "@tidelightorg/sdk"],
  ["public/components/mcp/server", "@tidelightorg/mcp"],
  ["packages/react", "@tidelightorg/react"],
  ["packages/cli", "@tidelightorg/cli"],
];
async function collectText(directory) {
  const values = [];
  const { readdir } = await import("node:fs/promises");
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) values.push(...await collectText(target));
    else if (/\.(?:js|mjs|cjs|d\.ts)$/.test(entry.name)) values.push(await readFile(target, "utf8"));
  }
  return values;
}
try {
  const mirrors = [];
  for (const [source, expectedName] of sources) {
    const directory = path.join(output, source.replaceAll("/", "-"));
    const mirror = await prepareGitHubNpmMirror(source, directory, root);
    assert.equal(mirror.name, expectedName);
    assert.equal(mirror.manifest.publishConfig.registry, "https://npm.pkg.github.com");
    const sourceManifest = JSON.parse(await readFile(path.join(root, source, "package.json"), "utf8"));
    assert.equal(mirror.manifest.version, sourceManifest.version);
    const readme = await readFile(path.join(directory, "README.md"), "utf8");
    assert.match(readme, /GitHub Packages mirror/);
    mirrors.push({ source, directory, manifest: mirror.manifest });
  }
  const sdk = mirrors.find(item => item.source === "sdk/typescript");
  const cli = mirrors.find(item => item.source === "packages/cli");
  const react = mirrors.find(item => item.source === "packages/react");
  assert.equal(cli.manifest.dependencies["@tidelightorg/sdk"], "^" + sdk.manifest.version);
  assert.equal(cli.manifest.dependencies["@tidelight/sdk"], undefined);
  assert.equal(react.manifest.peerDependencies["@tidelightorg/sdk"], "^" + sdk.manifest.version);
  assert.equal(react.manifest.peerDependencies["@tidelight/sdk"], undefined);
  for (const mirror of [cli, react]) {
    const files = await collectText(path.join(mirror.directory, "dist"));
    assert.ok(files.some(content => content.includes("@tidelightorg/sdk")), mirror.manifest.name + " must use the mirrored SDK scope in its compiled entry points");
    assert.ok(files.every(content => !content.includes('"@tidelight/sdk"')), mirror.manifest.name + " contains a stale canonical SDK import");
  }
  console.log("GitHub npm mirror staging checks passed for SDK, MCP, React, and CLI.");
} finally {
  await rm(output, { recursive: true, force: true });
}
