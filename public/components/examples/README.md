<div align="center">
  <img src="https://tidelight.app/tidelight-mark.svg" alt="Tidelight" width="56" height="56" />
  <h1>Tidelight API examples</h1>
  <p><strong>Runnable REST examples with explicit scopes, provenance, and service boundaries.</strong></p>
  <p><a href="https://tidelight.app">Product</a> · <a href="https://dev.tidelight.app/api">API guide</a> · <a href="https://github.com/TidelightOrg/tidelight">Mother repository</a></p>
  <p><a href="README.zh-CN.md">简体中文版本 / Chinese README</a></p>
</div>

---

Runnable examples for the live Tidelight Intelligence Cloud REST API. They use actual service responses; the repository contains no API keys or fabricated market data.

| File | Scope | What it demonstrates |
| --- | --- | --- |
| [`rest/market.mjs`](rest/market.mjs) | `market:read` | Native Node `fetch` and provenance-aware response handling |
| [`rest/market.py`](rest/market.py) | `market:read` | Python standard library request handling |
| [`rest/research.mjs`](rest/research.mjs) | `research:run` | Idempotent asynchronous job start and bounded polling |
| [`rest/research.py`](rest/research.py) | `research:run` | Python job start, polling, and terminal-state handling |
| [`rest/market.sh`](rest/market.sh) | `market:read` | Minimal `curl` request |

## Quickstart

Set credentials in the shell. Do not place them in source files, web pages, command-line arguments, shared logs, or committed `.env` files.

```sh
export TIDELIGHT_API_KEY='tl_test_…'
node rest/market.mjs
python rest/market.py
./rest/market.sh
```

Research examples can start provider-backed jobs and consume quota. Use a test project/key when evaluating them. The scripts print API status and request IDs. They distinguish `tokenized_equity_spot` instruments from direct equities and perpetual contracts, and display only fields returned by the service.

Market data is returned only when the API's provider terms gate allows it. Until redistribution authorization is configured, the expected response is HTTP 503 with `provider_terms_unconfirmed`; examples surface that response and never substitute cached or invented values. Python REST examples reject redirects so bearer credentials cannot be forwarded to another host.

## Official SDKs

- **TypeScript / JavaScript:** [`@tidelight/sdk`](https://www.npmjs.com/package/@tidelight/sdk) on npm · [source](https://github.com/TidelightOrg/tidelight-sdk)
- **Python:** [`tidelight`](https://pypi.org/project/tidelight/) on PyPI · [source](https://github.com/TidelightOrg/tidelight-python)
- **MCP:** [`@tidelight/mcp`](https://www.npmjs.com/package/@tidelight/mcp) on npm · [source](https://github.com/TidelightOrg/tidelight-mcp)

The canonical implementation and package manifests live in the [Tidelight mother repository](https://github.com/TidelightOrg/tidelight). Public repositories are generated source mirrors; propose changes in the mother repository. Packages are released only after their source and consumer-install checks pass.
The coordinated v0.1.2 release updates the TypeScript SDK, Python SDK, MCP bridge, React integration, and CLI together.

## Validate the examples

```sh
npm ci
npm test
npm run test:python
```

Tests use mocked HTTP responses. They verify authentication, bounded polling, error handling, redirect rejection before credentials can be forwarded, and that secrets are not printed. Tests do not call production or represent mock responses as market data.

## Related repositories

- [REST API and OpenAPI contract](https://github.com/TidelightOrg/tidelight-api)
- [MCP server and local bridge](https://github.com/TidelightOrg/tidelight-mcp)
- [TypeScript SDK](https://github.com/TidelightOrg/tidelight-sdk)
- [Python SDK](https://github.com/TidelightOrg/tidelight-python)
- [Mother repository](https://github.com/TidelightOrg/tidelight)
