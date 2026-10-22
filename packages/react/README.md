<div align="center">
  <img src="https://tidelight.app/tidelight-mark.svg" alt="Tidelight" width="56" height="56" />
  <h1>Tidelight React</h1>
  <p><strong>Typed, accessible React integrations for Tidelight market research.</strong></p>
  <p><a href="https://tidelight.app">Product</a> · <a href="https://dev.tidelight.app/api">API guide</a> · <a href="https://github.com/TidelightOrg/tidelight">Mother repository</a></p>
</div>

---

Typed React hooks and accessible, themeable UI helpers for Tidelight market and research workflows. The source package wraps the official SDK’s typed methods; it does not duplicate API requests, authorization, billing, or research logic.

Install with `npm install @tidelight/react@0.1.2 @tidelight/sdk@0.1.2 react react-dom`.

## Local development

```sh
cd sdk/typescript && npm ci && npm test
cd ../../packages/react
npm ci
npm test
```

React 18 and 19 are declared as peer-compatible versions. The package uses the current `@tidelight/sdk` client interface for types.

## Security boundary

Never construct the official SDK with a Tidelight API key in a browser bundle. `TidelightProvider` receives a structurally compatible client, so provide an application server route or server action that keeps its project credential in server-only configuration and returns authorized, structured responses to the signed-in user. Apply your application's own user authentication, tenant isolation, CSRF, and request limits at that boundary. The React package itself does not authenticate users or store credentials.

## Hooks

- `useTidelightClient()` returns the client from `TidelightProvider` and throws a clear error outside the provider.
- `useTokenizedEquities(query)` loads supported instruments, aborts stale requests, and exposes data, loading, error, and refresh state.
- `useResearchJob(jobId, { pollIntervalMs })` reads a research job; polling is opt-in and stops on a terminal state.
- `useStartCompanyResearch()` exposes `start(ticker, idempotencyKey?)` and `cancel()` with request, error, and loading state.

The `TokenizedEquityGrid` component renders provider-returned instruments and has loading, error/retry, and empty states. It preserves the distinction between tokenized equity spot products and direct stock shares or perpetual contracts. Import `@tidelight/react/styles.css` to use its restrained default surface styling, or override the documented `--tidelight-*` CSS custom properties.

## Example

```tsx
import { TidelightProvider, TokenizedEquityGrid, useTokenizedEquities } from "@tidelight/react";
import "@tidelight/react/styles.css";

function MarketPanel() {
  const result = useTokenizedEquities({ underlyingTicker: "NVDA", limit: 20 });
  return <TokenizedEquityGrid
    instruments={result.data?.data ?? []}
    isLoading={result.isLoading}
    error={result.error?.message}
    onRetry={result.refresh}
  />;
}

// `applicationServerClient` calls your authenticated same-origin BFF.
// Keep the Tidelight project key on that server, never in this browser bundle.
export function App({ applicationServerClient }) {
  return <TidelightProvider client={applicationServerClient}><MarketPanel /></TidelightProvider>;
}
```

## Compatibility and support

| Surface | Support |
| --- | --- |
| React peer versions | React 18 and 19 |
| Runtime | Browser or React server/client application with an injected compatible transport |
| API operations | SDK tokenized-equity listing and company research job methods |
| Styling | Optional CSS file; custom properties can be themed |
| Peer dependencies | `@tidelight/sdk`, React 18 or 19, and React DOM 18 or 19 |

No hosted client-side credential flow or browser direct API usage is provided. API responses retain their normal Tidelight scopes, quota, provider and data-availability behavior. Retry behavior belongs to the supplied server-side SDK client.

## Errors and troubleshooting

- A missing provider throws `useTidelightClient must be used inside TidelightProvider.`
- A request failure is returned in the hook's `error`; loading and prior data remain explicit.
- Polling is disabled by default; set `pollIntervalMs` between 1 and 30000 to opt in.
- If no instruments match, the grid shows an empty state based on the returned array; it never invents instruments.
- If unauthorized requests reach the BFF, verify its user session-to-project authorization mapping and server-side project key configuration.

## Release and security

See [CHANGELOG.md](./CHANGELOG.md) for release history. Do not put credentials in UI props, error messages, logs, or examples.
