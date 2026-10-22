<div align="center">
  <img src="https://tidelight.app/tidelight-mark.svg" alt="Tidelight" width="56" height="56" />
  <h1>Tidelight Intelligence Cloud MCP</h1>
  <p><strong>Scoped research and market tools over the Model Context Protocol.</strong></p>
  <p><a href="https://tidelight.app">Product</a> · <a href="https://dev.tidelight.app#mcp">Connection guide</a> · <a href="https://github.com/TidelightOrg/tidelight">Mother repository</a></p>
</div>

---

Connect compatible MCP clients to the hosted Streamable HTTP service:

```text
https://mcp.tidelight.app/mcp
```

The service accepts Tidelight OAuth access tokens and scoped developer API keys. OAuth grants are approved on the Tidelight consent screen and cannot exceed the scopes on the bound project key. Discovery metadata is available from the [protected-resource](https://mcp.tidelight.app/.well-known/oauth-protected-resource/mcp) and [authorization-server](https://mcp.tidelight.app/.well-known/oauth-authorization-server) endpoints.

## Available tools

| Tool | Scope | Purpose |
| --- | --- | --- |
| `tidelight_search_tokenized_equities` | `market:read` | Search supported Reality tokenized-equity spot instruments |
| `tidelight_get_tokenized_equity` | `market:read` | Retrieve supported instruments by underlying ticker |
| `tidelight_start_company_research` | `research:run` | Start an asynchronous company research snapshot |
| `tidelight_get_research_job` | `research:run` | Read status and any completed result |
| `tidelight_cancel_research_job` | `research:run` | Request cancellation of queued work |

These instruments are tokenized spot products, not direct US shares or stock perpetual contracts. Research results preserve source context; they are not recommendations and do not expose private model chain-of-thought. Provider terms and project scopes remain enforced by the service.

## Local stdio bridge

The [`@tidelight/mcp`](https://www.npmjs.com/package/@tidelight/mcp) package forwards tool discovery and calls from stdio-only clients to the hosted service. Install the current release and provide a scoped key through the client’s protected environment:

```sh
npm install --global @tidelight/mcp@0.1.2
export TIDELIGHT_API_KEY='YOUR_TIDELIGHT_PROJECT_KEY'
tidelight-mcp
```

The bridge does not run the production service or bypass authentication, tenant isolation, quotas, provider access, or operational controls. OAuth is available when a compatible client connects directly to the hosted endpoint.

## Source and verification

The protocol core, bridge, and tests are maintained in [`public/components/mcp`](https://github.com/TidelightOrg/tidelight/tree/main/public/components/mcp) in the mother repository. The standalone [MCP repository](https://github.com/TidelightOrg/tidelight-mcp) is a generated source mirror; propose changes in the mother repository.

```sh
cd server
npm ci
npm test
npm pack --dry-run
```

These tests validate the protocol implementation and package behavior. They do not certify a named third-party client’s complete OAuth, refresh, invocation, and revocation flow.

## Related resources

- [MCP connection guide](https://dev.tidelight.app#mcp)
- [REST API and OpenAPI contract](https://github.com/TidelightOrg/tidelight-api)
- [Changelog](./server/CHANGELOG.md)
- [Container package](https://github.com/orgs/TidelightOrg/packages/container/package/tidelight-mcp)
