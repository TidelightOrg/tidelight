import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import YAML from "yaml";

test("package publisher is a manual main-branch workflow with protected release gates", async () => {
  const source = await readFile(new URL("../.github/workflows/publish-packages.yml", import.meta.url), "utf8");
  const workflow = YAML.parse(source);
  assert.ok(workflow.on.workflow_dispatch);
  assert.deepEqual(workflow.permissions, { contents: "read" });
  assert.match(source, /PUBLISH OFFICIAL PACKAGES/);
  assert.match(source, /github\.ref == 'refs\/heads\/main'/);
  assert.match(source, /actions\/upload-artifact@v4/);
  assert.match(source, /actions\/download-artifact@v4/);
  assert.match(source, /sha256sum -c SHA256SUMS/);
  assert.match(source, /TIDELIGHT_REGISTRY_PUBLISHING_ENABLED == 'true'/);
  assert.match(source, /NODE_AUTH_TOKEN:.*secrets\.NPM_TOKEN/);
  assert.doesNotMatch(source, /PYPI_API_TOKEN|twine upload/);
});

test("registry write permission is limited to protected OIDC jobs and release order", async () => {
  const source = await readFile(new URL("../.github/workflows/publish-packages.yml", import.meta.url), "utf8");
  const workflow = YAML.parse(source);
  assert.equal(workflow.jobs["publish-npm"].environment, "npm-publish");
  assert.equal(workflow.jobs["publish-pypi"].environment, "pypi-publish");
  assert.deepEqual(workflow.jobs["publish-npm"].permissions, { contents: "read", "id-token": "write" });
  assert.deepEqual(workflow.jobs["publish-pypi"].permissions, { contents: "read", "id-token": "write" });
  assert.doesNotMatch(JSON.stringify(workflow.jobs.build), /id-token|npm publish|gh-action-pypi-publish/);
  const sdk = source.indexOf('publish_or_verify "@tidelight/sdk"');
  const mcp = source.indexOf('publish_or_verify "@tidelight/mcp"');
  const react = source.indexOf('publish_or_verify "@tidelight/react"');
  const cli = source.indexOf('publish_or_verify "@tidelight/cli"');
  assert.ok(sdk >= 0 && sdk < mcp && mcp < react && react < cli);
  assert.match(source, /--provenance/);
  assert.match(source, /gh-action-pypi-publish@release\/v1/);
  assert.match(source, /publish_or_verify/);
  assert.match(source, /Existing .* has different content/);
  assert.match(source, /group: publish-official-packages-\$\{\{ github\.repository \}\}/);
});
