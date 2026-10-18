import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { stageNpmReleasePackage } from "../scripts/prepare-npm-package-release.mjs";

test("release staging removes source-only fields and rewrites the CLI SDK dependency", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "tidelight-release-stage-"));
  try {
    const sdkDirectory = path.join(root, "sdk/typescript");
    const cliDirectory = path.join(root, "packages/cli");
    const output = path.join(root, "staged/cli");
    await mkdir(sdkDirectory, { recursive: true });
    await mkdir(path.join(cliDirectory, "dist"), { recursive: true });
    await mkdir(path.join(cliDirectory, "bin"), { recursive: true });
    await writeFile(path.join(sdkDirectory, "package.json"), JSON.stringify({ version: "0.1.0" }));
    const manifest = {
      name: "@tidelight/cli",
      version: "0.1.0",
      private: true,
      license: "Apache-2.0",
      files: ["dist", "bin", "README.md", "CHANGELOG.md", "LICENSE", "NOTICE"],
      bin: { tidelight: "./bin/tidelight.mjs" },
      dependencies: { "@tidelight/sdk": "file:../../sdk/typescript" },
      devDependencies: { typescript: "5.9.3" },
      scripts: { prepack: "npm run build" },
    };
    await writeFile(path.join(cliDirectory, "package.json"), JSON.stringify(manifest));
    for (const name of ["README.md", "CHANGELOG.md", "LICENSE", "NOTICE"]) {
      await writeFile(path.join(cliDirectory, name), name);
    }
    await writeFile(path.join(cliDirectory, "dist/index.js"), "export {};\n");
    await writeFile(path.join(cliDirectory, "bin/tidelight.mjs"), "#!/usr/bin/env node\n");

    const staged = await stageNpmReleasePackage(cliDirectory, output, root);
    const releaseManifest = JSON.parse(await readFile(path.join(output, "package.json"), "utf8"));
    assert.equal(staged.name, "@tidelight/cli");
    assert.equal("private" in releaseManifest, false);
    assert.equal(releaseManifest.dependencies["@tidelight/sdk"], "^0.1.0");
    assert.equal("devDependencies" in releaseManifest, false);
    assert.equal("scripts" in releaseManifest, false);
    for (const name of manifest.files) {
      const copied = await stat(path.join(output, name));
      if (name === "dist" || name === "bin") assert.equal(copied.isDirectory(), true);
      else assert.ok(await readFile(path.join(output, name)));
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
