<div align="center">
  <img src="https://tidelight.app/tidelight-mark.svg" alt="Tidelight" width="56" height="56" />
  <h1>Tidelight TypeScript SDK</h1>
  <p><strong>Typed access to Tidelight Intelligence Cloud API v1.</strong></p>
  <p><a href="https://tidelight.app">Product</a> · <a href="https://dev.tidelight.app/api">API guide</a> · <a href="https://github.com/TidelightOrg/tidelight">canonical repository</a></p>
</div>

---

The official TypeScript / JavaScript client supports tokenized-equity market listings, asynchronous company research jobs, and research webhooks. It preserves provider provenance and API error context, with bounded polling, timeouts, and retries.

## Install

```sh
npm install @tidelight/sdk@0.1.2
```

Keep the project API key in trusted server code. Never expose it in a browser bundle or client-side application.

## Quickstart

```ts
import { TidelightClient } from "@tidelight/sdk";

const client = new TidelightClient({ apiKey: process.env.TIDELIGHT_API_KEY! });
const page = await client.listTokenizedEquities({
  limit: 20,
  underlyingTicker: "AAPL",
});

for (const instrument of page.data) {
  console.log(instrument.symbol, instrument.underlying_ticker);
}
```

## Supported workflows

| Workflow | Scope | Client methods |
| --- | --- | --- |
| Tokenized-equity spot listings and pagination | `market:read` | `listTokenizedEquities`, `tokenizedEquities` |
| Company research snapshots | `research:run` | `startCompanyResearch`, `getResearchJob`, `cancelResearchJob`, `waitForResearchJob` |
| Research webhooks and delivery history | `alerts:manage` | `createWebhook`, `updateWebhook`, `listWebhooks`, `listWebhookDeliveries` |

A tokenized-equity spot instrument is not a direct share or a stock perpetual. Market data availability follows the service's provider terms gate. The client returns that decision without inventing substitute data.

## Reliability and security

Requests have a 10-second default timeout. Network errors, `429`, and transient `5xx` responses receive at most two bounded retries by default. Webhook mutations are not automatically retried because the API does not accept webhook idempotency keys. Errors retain the HTTP status, stable API code, and request ID; raw provider bodies and API keys are not returned.

Webhook creation and secret rotation return a one-time signing secret. **TODO: Persist** it in your approved secret manager immediately. Do not print it; it cannot be recovered by listing the endpoint.

## Build and test from source

```sh
npm ci
npm test
```

The SDK source is maintained in [`sdk/typescript`](https://github.com/TidelightOrg/tidelight/tree/main/sdk/typescript) in the canonical repository. The standalone [TypeScript repository](https://github.com/TidelightOrg/tidelight-sdk) is a synchronized source mirror. Make source changes in the canonical repository.

## Further reading

- [API reference](https://dev.tidelight.app/api)
- [OpenAPI contract](https://github.com/TidelightOrg/tidelight/blob/main/docs/tic-openapi.yaml)
- [Changelog](./CHANGELOG.md)
- [Security policy](https://github.com/TidelightOrg/tidelight/security/policy)
