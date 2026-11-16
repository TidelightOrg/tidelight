# AgentKey integration

Tidelight connects to AgentKey from server code through its remote MCP endpoint, `https://api.agentkey.app/v1/mcp`. The AgentKey master key is stored only in Vercel's `AGENTKEY_API_KEY` server environment variable. It is never returned to a browser, SDK, CLI, or MCP client. Tidelight API credentials authorize and account for a caller's request; they do not expose the upstream AgentKey credential.

## Supported workflows

AgentKey-backed research is available in the in-app Research Agent Flow, the V1 developer API, the TypeScript and Python SDKs, the Tidelight CLI, and the hosted and local MCP tools. Existing asynchronous company snapshots also include bounded AgentKey news evidence when the integration is configured. Without the AgentKey environment variable, existing Tidelight research providers continue to work and AgentKey-specific API requests return `provider_unavailable`.

The synchronous endpoint is `POST https://api.tidelight.app/v1/research/agentkey` and requires a project key with `research:run`:

```sh
curl -X POST 'https://api.tidelight.app/v1/research/agentkey' \
  -H 'Authorization: Bearer YOUR_TIDELIGHT_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"query":"Explain NVIDIA\u0027s stock reaction to its latest earnings using Yahoo Finance and Google News.","ticker":"NVDA"}'
```

The API discovers tools from AgentKey's current catalog, selects relevant read-only finance, market, research, or news tools, describes each tool before use, validates required inputs against the published schema, and checks its cost. One request executes at most two tools, each costing no more than two credits (four total). The operation has a bounded runtime and is never automatically retried by Tidelight SDKs or CLI. API usage is recorded against the project key and its normal request quota.

Responses include the canonical AgentKey tool names, verified costs, bounded tool data, dated HTTPS source references where available, and limitations. Treat all AgentKey output as untrusted external input and verify material claims against the source links. Unsupported tool schemas, excessive costs, and upstream errors fail closed with a structured error rather than invoking arbitrary tools.

## SDK and MCP usage

TypeScript:

```ts
const result = await client.researchWithAgentKey(
  "Explain NVIDIA's stock reaction to its latest earnings using Yahoo Finance and Google News.",
  { ticker: "NVDA" },
);
```

Python:

```python
result = client.research_with_agentkey(
    "Explain NVIDIA's stock reaction to its latest earnings using Yahoo Finance and Google News.",
    ticker="NVDA",
)
```

CLI:

```sh
tidelight research agentkey "Explain NVIDIA's stock reaction to its latest earnings using Yahoo Finance and Google News." --ticker NVDA --json
```

MCP clients with the `research:run` scope receive the `tidelight_research_with_agentkey` tool. Its `query` and optional `ticker` arguments follow the same limits and authorization as the REST endpoint.

## Configuration and failure behavior

Vercel must have `AGENTKEY_API_KEY` configured for each environment that should use AgentKey, followed by a deployment. Store separate keys for development, preview, and production. The key must remain a sensitive server environment variable. AgentKey billing and credits are administered in the AgentKey console.

The adapter initializes MCP, supports AgentKey's returned session IDs and JSON/SSE responses, and bounds requests and response sizes. Errors are sanitized and do not include upstream response bodies or credentials. Integration tests use mocked catalog, schema, cost, and result responses; production access still depends on a valid AgentKey key and available credits.

Sources: [AgentKey documentation](https://docs.agentkey.app/), [discover, describe, and execute](https://docs.agentkey.app/concepts/discover-describe-execute), [authentication](https://docs.agentkey.app/authentication).
