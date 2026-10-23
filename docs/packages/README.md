# Official Tidelight packages

`TidelightOrg/tidelight` is the canonical source repository. The first public package release is `0.1.2` (2026-10-18). The Developer Center reads current versions from npm and PyPI and links to each registry artifact.

## Published packages

| Package | Source | Current version | Install | Registry |
|---|---|---:|---|---|
| TypeScript SDK | `sdk/typescript` | 0.1.2 | `npm install @tidelight/sdk` | [npm](https://www.npmjs.com/package/@tidelight/sdk) |
| MCP bridge | `public/components/mcp/server` | 0.1.2 | `npm install @tidelight/mcp` | [npm](https://www.npmjs.com/package/@tidelight/mcp) |
| Python SDK | `sdk/python` | 0.1.2 | `python -m pip install tidelight` | [PyPI](https://pypi.org/project/tidelight/) |
| React | `packages/react` | 0.1.2 | `npm install @tidelight/react` | [npm](https://www.npmjs.com/package/@tidelight/react) |
| CLI | `packages/cli` | 0.1.2 | `npm install @tidelight/cli` | [npm](https://www.npmjs.com/package/@tidelight/cli) |

Install reproducibly by pinning `0.1.2` in application manifests and lockfiles. Do not expose Tidelight API keys in browser code, public repositories, client logs, or shared MCP config; use a trusted server or protected process environment. The React package takes a server-provided client interface and never accepts privileged credentials.

## MCP container

The deployable stdio MCP bridge is also distributed as a multi-architecture OCI image from GHCR. The image is built from the same canonical MCP source as the npm package and runs as the unprivileged `node` user. Its build includes provenance and an SBOM; the API key is supplied at container runtime.

```sh
docker pull ghcr.io/tidelightorg/tidelight-mcp:0.1.2
export TIDELIGHT_API_KEY='YOUR_TIDELIGHT_PROJECT_KEY'
docker run --rm -i -e TIDELIGHT_API_KEY ghcr.io/tidelightorg/tidelight-mcp:0.1.2
```

The image supports `linux/amd64` and `linux/arm64`. Pin the version tag for reproducible deployments; `latest` tracks a main-branch build. Browse [the GHCR package](https://github.com/orgs/TidelightOrg/packages/container/package/tidelight-mcp) and [MCP package instructions](https://tidelight.app/developers/packages/mcp).

## Package boundaries and safety

- The SDK owns typed HTTP transport, pagination, bounded retries/timeouts, research-job polling, and supported webhook operations.
- The MCP bridge adapts the hosted, scope-filtered service to stdio clients. The hosted service remains authoritative for authorization and research behavior.
- Python mirrors the supported REST surface. React contains browser-safe hooks and UI only. The CLI uses the SDK and protected OS credential storage where available.
- The API contract remains documented in `docs/tic-openapi.yaml`; no separate API contract package is published.
- Results preserve source context and do not expose private model reasoning. Package examples are illustrative; actual market coverage and data access remain subject to account scopes and provider terms.

## Release and verification

`.github/workflows/publish-packages.yml` is the protected manual npm/PyPI publisher. It validates the requested version, builds and tests source packages, verifies archive integrity and checksums, and only publishes after the required environment protections. npm uses the configured `NPM_TOKEN` secret for this first release path; PyPI uses its Trusted Publisher. The release artifacts and registry hashes are verified against the tested workflow candidate.

`.github/workflows/publish-mcp-container.yml` tests the MCP package and Docker startup on pull requests, then publishes `0.1.2`, commit-SHA, and `latest` image tags to GHCR from `main` after verification. The publisher grants `packages: write` only to the publish job. Container CI verifies a clean image build and the startup failure path when no key is provided.

The registry-backed Developer Center endpoint refreshes npm and PyPI metadata every five minutes. If a registry lookup fails, package pages continue to show the last known release version and a visible unavailable status rather than inventing a new version.

## Follow-up administration

- Configure npm Trusted Publishing for later releases and retain the token path only as the authorized fallback for environments where npm OIDC is unavailable.
- Review package ownership, organization/team access, provenance, dependency policy, and registry account recovery procedures on a regular cadence.
- Maintain the Node.js, Python, React, MCP protocol, and API compatibility matrix based on tested releases.
- Publish dated migration guidance for breaking changes and keep the canonical repository as the source of truth for npm, PyPI, and GHCR artifacts.
