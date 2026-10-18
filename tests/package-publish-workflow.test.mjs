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
  assert.doesNotMatch(source, /NPM_TOKEN|PYPI_API_TOKEN|twine upload/);
});

test("registry write permission is limited to protected OIDC jobs and release order", async () => {
  const source = await readFile(new URL("../.github/workflows/publish-packages.yml", import.meta.url), "utf8");
  const workflow = YAML.parse(source);
  assert.equal(workflow.jobs["publish-npm"].environment, "npm-publish");
  assert.equal(workflow.jobs["publish-pypi"].environment, "pypi-publish");
  assert.deepEqual(workflow.jobs["publish-npm"].permissions, { contents: "read", "id-token": "write" });
  assert.deepEqual(workflow.jobs["publish-pypi"].permissions, { contents: "read", "id-token": "write" });
  assert.doesNotMatch(JSON.stringify(workflow.jobs.build), /id-token|npm publish|gh-action-pypi-publish/);
  const sdk = source.indexOf("@tidelight/sdk@$RELEASE_VERSION");
  const mcp = source.indexOf("tidelight-mcp-$RELEASE_VERSION.tgz");
  const react = source.indexOf("tidelight-react-$RELEASE_VERSION.tgz");
  const cli = source.indexOf("tidelight-cli-$RELEASE_VERSION.tgz");
  assert.ok(sdk >= 0 && sdk < mcp && mcp < react && react < cli);
  assert.match(source, /--provenance/);
  assert.match(source, /gh-action-pypi-publish@release\/v1/);
});
