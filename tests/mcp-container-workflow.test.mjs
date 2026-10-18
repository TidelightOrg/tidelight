import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import YAML from "yaml";

const root = new URL("../", import.meta.url);

test("GHCR publisher builds, publishes and anonymously pulls only after verification", async () => {
  const source = await readFile(new URL(".github/workflows/publish-mcp-container.yml", root), "utf8");
  const workflow = YAML.parse(source);
  assert.ok(workflow.jobs.verify);
  assert.deepEqual(workflow.jobs.verify.permissions, { contents: "read" });
  assert.equal(workflow.jobs.publish.needs, "verify");
  assert.deepEqual(workflow.jobs.publish.permissions, { contents: "read", packages: "write" });
  assert.equal(workflow.jobs["verify-public-pull"].needs, "publish");
  assert.deepEqual(workflow.jobs["verify-public-pull"].permissions, { contents: "read" });
  assert.match(workflow.jobs["verify-public-pull"].steps[0].run, /docker pull.*IMAGE_VERSION/);
  assert.match(workflow.jobs["verify-public-pull"].steps[0].run, /docker pull ghcr\.io\/tidelightorg\/tidelight-mcp:latest/);
  assert.match(workflow.jobs["verify-public-pull"].steps[1].run, /TIDELIGHT_API_KEY is required/);
  assert.match(workflow.jobs.publish.steps.at(-1).with.annotations, /org\.opencontainers\.image\.description/);
  assert.match(workflow.jobs.publish.steps.at(-1).with.annotations, /org\.opencontainers\.image\.source=https:\/\/github\.com\/TidelightOrg\/tidelight/);
});

test("MCP image is multi-stage, non-root and linked to the mother repository", async () => {
  const dockerfile = await readFile(new URL("public/components/mcp/server/Dockerfile", root), "utf8");
  assert.match(dockerfile, /FROM node:22-alpine AS build/);
  assert.match(dockerfile, /FROM node:22-alpine AS runtime/);
  assert.match(dockerfile, /USER node/);
  assert.match(dockerfile, /org\.opencontainers\.image\.source="https:\/\/github\.com\/TidelightOrg\/tidelight"/);
  assert.doesNotMatch(dockerfile, /ARG .*TOKEN|ENV .*API_KEY/i);
});
