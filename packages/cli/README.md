<div align="center">
  <img src="https://tidelight.app/tidelight-mark.svg" alt="Tidelight" width="56" height="56" />
  <h1>Tidelight CLI</h1>
  <p><strong>Secure terminal workflows for the supported Tidelight API.</strong></p>
  <p><a href="https://tidelight.app">Product</a> · <a href="https://dev.tidelight.app/api">API guide</a> · <a href="https://github.com/TidelightOrg/tidelight">canonical repository</a></p>
  <p><a href="README.zh-CN.md">简体中文版本 / Chinese README</a></p>
</div>

---

The official Tidelight command-line client for supported API v1 workflows. Install globally with `npm install --global @tidelight/cli@0.1.2`.

## Local source setup

The source CLI calls the canonical TypeScript SDK and does not reimplement its HTTP transport. Build the SDK first so its package exports are available, then build the CLI:

```sh
cd sdk/typescript && npm ci && npm test
cd ../../packages/cli
npm ci
npm test
node dist/bin.js --help
```

Node.js 22 or newer is required. Use a Tidelight project API key with only the scopes needed by the command. API keys are created and revoked in the Developer Center.

## Authentication

`tidelight auth login` reads the key without echoing it and stores it in the operating-system credential store (macOS Keychain, Windows Credential Manager, or Linux Secret Service). Linux requires an unlocked Secret Service provider such as GNOME Keyring or KWallet. If the credential store is unavailable, set `TIDELIGHT_API_KEY` for the current process or shell instead; the CLI never writes a plaintext credential file. Environment credentials take precedence over the keychain. `auth status` shows only the source, never the credential; `auth logout` deletes the keychain value but does not modify the shell environment.

## Supported commands

```sh
tidelight market instruments --ticker NVDA --limit 20
tidelight market instruments --json

tidelight research start NVDA
tidelight research start NVDA --wait --timeout-ms 120000
tidelight research get 00000000-0000-4000-8000-000000000000 --json
tidelight research cancel 00000000-0000-4000-8000-000000000000

tidelight webhooks list
tidelight webhooks create --name "Research alerts" --url https://example.com/tidelight --events research.job.completed
tidelight webhooks update 00000000-0000-4000-8000-000000000000 --rotate-secret
tidelight webhooks disable 00000000-0000-4000-8000-000000000000
tidelight webhooks deliveries --json
```

These commands map to the existing SDK and OpenAPI contract only: supported Reality tokenized-equity spot instruments, asynchronous company research jobs, and research-job webhooks. The CLI does not create a full research report, strategy, scenario, live order, or account/project/key. Service-side scopes, tenant ownership, quotas, and provider terms remain authoritative.

Research calls generate a UUID idempotency key by default. Use `--idempotency-key` when a caller needs a stable key across a retry. `--wait` polls until a terminal state or bounded timeout; Ctrl-C stops local polling, while `research cancel` explicitly requests server cancellation.

Market results carry server-returned provenance and tokenized-instrument type. A `provider_terms_unconfirmed` error means the service cannot currently return this feed; the CLI surfaces that service decision and does not substitute another provider. It does not imply direct stock shares or perpetual-contract prices.

Webhook signing secrets are shown only in the successful create/rotation response. The CLI emits a warning on stderr and never saves or retries mutations; copy the secret to a secret manager immediately. Do not pipe secret-bearing output into logs.

## Errors and compatibility

HTTP status, stable API error code, and request ID are shown when the API provides them. Credential values and raw provider bodies are never included in CLI error output. Transient retry behavior comes from the shared SDK. Node.js 22+, the matching `@tidelight/sdk` release, and the Tidelight versioned API v1 are the supported compatibility targets.

## Release state and security

See [CHANGELOG.md](./CHANGELOG.md) for release history.


The clean consumer rehearsal is `npm run test:package-consumers` from the canonical repository. It installs the packaged CLI with its matching SDK in an isolated project, checks installed `--help`, then confirms an unauthenticated research command exits before making a network request. It does not publish either archive.
