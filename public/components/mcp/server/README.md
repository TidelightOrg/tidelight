# `@tidelight/mcp`

`@tidelight/mcp` is the official local stdio bridge for MCP clients that cannot connect directly to a remote Streamable HTTP server. It forwards tool discovery and calls to the authenticated Tidelight MCP service. The remote service continues to enforce credentials, scopes, quotas, and tenant boundaries.

Install with `npm install @tidelight/mcp`. Use Node.js 22 or later.

## Build and test from the mother repository

```sh
cd public/components/mcp/server
npm ci
npm test
npm run build
```

The package test suite verifies the protocol core, scoped tool discovery, remote MCP forwarding, safe endpoint validation, and that the API key is not included in tool results or connection errors.

## Run the source bridge

Use Node.js 22, the runtime currently tested in package CI. Create a project API key with `market:read`, `research:run`, or both, then provide it through your local secret manager or process environment:

```sh
export TIDELIGHT_API_KEY='YOUR_TIDELIGHT_PROJECT_KEY'
node ./dist/cli.js
```

Run the command with `public/components/mcp/server` as the working directory after building. The bridge writes MCP protocol traffic to stdout; connection errors go to stderr. It never prints the API key. The default upstream endpoint is `https://mcp.tidelight.app/mcp`. A custom `TIDELIGHT_MCP_URL` is accepted only over HTTPS, except for loopback HTTP during local testing.

## Client configuration from source

Point a stdio-capable MCP client at the built CLI. Client configuration formats differ; the following is the general command shape, not a copyable absolute path:

```json
{
  "mcpServers": {
    "tidelight": {
      "command": "node",
      "args": ["/absolute/path/to/tidelight/public/components/mcp/server/dist/cli.js"],
      "env": {
        "TIDELIGHT_API_KEY": "YOUR_TIDELIGHT_PROJECT_KEY"
      }
    }
  }
}
```

Keep the key in the client’s protected environment or secret store. Do not commit real credentials to the client configuration. The bridge accepts API keys; OAuth is available when connecting a compatible client directly to the hosted endpoint.

## Tools and access

The upstream Tidelight service returns only tools allowed by the key’s current scopes. The current tools are:

| Tools | Scope |
| --- | --- |
| `tidelight_search_tokenized_equities`, `tidelight_get_tokenized_equity` | `market:read` |
| `tidelight_start_company_research`, `tidelight_get_research_job`, `tidelight_cancel_research_job` | `research:run` |

Instrument results identify supported Reality tokenized-equity spot products; they are not direct US shares or stock perpetual contracts. Research results preserve source context and do not expose private model reasoning.

## Run the published container

The official container image is built from this repository's MCP server source and published to GitHub Container Registry. It uses the same stdio bridge as the npm package; the API key is supplied at runtime and is never baked into the image.

```sh
docker pull ghcr.io/tidelightorg/tidelight-mcp:0.1.1
export TIDELIGHT_API_KEY='YOUR_TIDELIGHT_PROJECT_KEY'
docker run --rm -i -e TIDELIGHT_API_KEY ghcr.io/tidelightorg/tidelight-mcp:0.1.1
```

Use a scoped project key with `market:read`, `research:run`, or both. For an MCP client that supports Docker-backed stdio servers, configure `docker` as the command, `run`, `--rm`, `-i`, `-e`, `TIDELIGHT_API_KEY`, and `ghcr.io/tidelightorg/tidelight-mcp:0.1.1` as arguments, with the key held in the client's protected environment. Pin a version tag for reproducible deployments; `latest` tracks the most recent main-branch build.

The image supports `linux/amd64` and `linux/arm64`.

## Library interface

The protocol server is exported from the package root. The local-to-remote bridge is available at `@tidelight/mcp/proxy` and exports `createTidelightMcpProxy({ apiKey, endpoint? })`, `validateTidelightMcpProxyOptions`, and `DEFAULT_TIDELIGHT_MCP_URL`. The proxy resolves after authenticated upstream MCP initialization and returns `{ server, close }`; connect its `server` to a client transport and call `close()` when the client session ends. The CLI performs this lifecycle for stdio clients.

## Compatibility and troubleshooting

| Item | Current support |
| --- | --- |
| Local transport | MCP stdio |
| Upstream transport | Streamable HTTP |
| Upstream authentication | Tidelight project API key in `TIDELIGHT_API_KEY` |
| Runtime | Node.js 22 tested; package requires Node.js 22+ |
| Third-party clients | Not individually certified by this package test |
| API service | Tidelight MCP service compatible with the current package protocol tests |

- **No tools appear:** confirm the key carries a supported scope and reconnect so the client repeats discovery.
- **Unauthorized:** create a new active project key and make sure the client process receives it in `TIDELIGHT_API_KEY`.
- **Upstream unavailable:** check network access to `mcp.tidelight.app`; the bridge does not replace upstream health or authorization.
- **Tool call denied:** the API remains authoritative for permission, quota, provider availability, and market redistribution terms.
- **Rate limit or quota response:** honor the service's retry guidance and do not add unbounded retries to tool calls.

## Release and security status

Version changes follow SemVer. The package source and included documentation are licensed under Apache-2.0. See LICENSE and NOTICE in this directory. The grant applies only to this package, not the proprietary application/backend or other mother-repository paths. Do not include keys in examples, logs, issue reports, or source control.

See the [hosted MCP connection guide](https://dev.tidelight.app#mcp) and [package status](https://tidelight.app/developers/packages). Registry publication, npm trusted publishing, provenance, and client-specific certification are pending.
