# Package publishing operations

This document covers future releases of the official packages in `TidelightOrg/tidelight`. The packages are already public at version `0.1.2` on npm and PyPI. The MCP stdio server is also published to GHCR.

## Current publishing paths

- npm packages: `@tidelight/sdk`, `@tidelight/mcp`, `@tidelight/react`, and `@tidelight/cli`.
- PyPI project: `tidelight`.
- GHCR image: `ghcr.io/tidelightorg/tidelight-mcp` (`linux/amd64` and `linux/arm64`).
- `publish-packages.yml` is the manual npm/PyPI release workflow. Keep the requested package version aligned with canonical manifests and the workflow's confirmation gates.
- npm presently uses the protected `npm-publish` environment and `NPM_TOKEN` secret. PyPI uses the protected `pypi-publish` environment and Trusted Publisher OIDC.
- `publish-mcp-container.yml` tests the MCP package and container on pull requests. On a verified push to `main`, it publishes semver, commit-SHA, and `latest` tags with BuildKit provenance and an SBOM.
- A separate least-privilege job anonymously pulls the versioned and `latest` tags after publication, then starts the released container with an empty environment to verify its safe missing-key message.

## Before a release

1. Update the package manifests and changelogs in the canonical repository. Keep SDK dependency ranges aligned across React and CLI.
2. Run `npm run test:public-mirrors`, `npm run test:package-consumers`, `npm run typecheck`, `npm test`, and `npm run check:package-catalog` as applicable.
3. Verify npm package archives and the Python wheel. Preserve the produced archive checksums and compare the published registry integrity values with the tested artifacts.
4. Confirm npm Trusted Publishing is configured for the exact GitHub repository, workflow, and environment. If OIDC is unavailable for a package, use the approved environment-scoped token path; never print or copy its value into logs.
5. Confirm PyPI's Trusted Publisher still names the correct repository, workflow, and `pypi-publish` environment.
6. Run container build and smoke tests for MCP source changes. Keep image labels, README instructions, and version tags synchronized with the package version.

## Image use

```sh
docker pull ghcr.io/tidelightorg/tidelight-mcp:0.1.2
export TIDELIGHT_API_KEY='YOUR_TIDELIGHT_PROJECT_KEY'
docker run --rm -i -e TIDELIGHT_API_KEY ghcr.io/tidelightorg/tidelight-mcp:0.1.2
```

Use a scoped project key and pass it at runtime. Never bake credentials into the image, Docker build arguments, Compose files committed to source control, or MCP client configuration shared across users.

## Verification references

- [Developer package directory](https://tidelight.app/developers/packages)
- [MCP package guide](https://tidelight.app/developers/packages/mcp)
- [GHCR MCP image](https://github.com/orgs/TidelightOrg/packages/container/package/tidelight-mcp)
- [npm SDK](https://www.npmjs.com/package/@tidelight/sdk)
- [PyPI project](https://pypi.org/project/tidelight/)
