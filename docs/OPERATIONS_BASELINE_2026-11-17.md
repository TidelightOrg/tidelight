# Tidelight operations baseline · 17 November 2026

This is a dated, read-only snapshot of production operations. It is not an uptime SLO, a service-wide error rate, or a signed-in user journey. Values describe observations at the timestamps below and can change independently.

## Production availability

At **17:53 UTC**, `https://status.tidelight.app/health` returned `status: operational` with `checkedAt: 2026-11-17T17:53:14Z`. Its component probes reported HTTP 200 for the Tidelight app, developer docs, package directory, REST API root, MCP server metadata, npm and PyPI registry pages, plus successful database read-only query and worker probes. The research-job API check confirms route availability only; no job was submitted. MCP metadata is public, while MCP tool access requires authentication.

At **17:50 UTC**, unauthenticated `GET /v1/market/instruments?kind=rtoken` on `api.tidelight.app` returned HTTP 401. At that time, `GET /mcp` on `mcp.tidelight.app` also returned 401 without credentials. These are expected authentication boundaries, not authenticated access checks. The REST API root returned 200. No browser-based signed-in journeys were performed.

The health endpoint did not report an application deployment commit in this snapshot (`deployment: null`). A separate production health response at **17:46 UTC** reported commit `ba8041e0ad19`, matching the merge commit for PR #538. Treat that as a point-in-time deployment observation, not a guarantee that every host was serving the same revision at 17:53.

## Database and scheduled work

The active Supabase project is `Tidelight` (`plmdnzbmvgigkzfmfwov`), region `eu-west-1`. The migration ledger contains 82 migrations and ends at `20261117170752 provider_request_correlation`. The `request_id` column is nullable and indexed only for non-null values; older rows remain valid.

At **17:50 UTC**, the following `pg_cron` jobs were active. `cron.job_run_details` showed successful SQL invocations in the observed window; that confirms the scheduled SQL ran, not that every downstream business operation completed correctly.

| Job | Schedule | Invocations / successes in last 24 hours | Latest invocation |
| --- | --- | ---: | --- |
| `nightwatch-custom-schedules` | Every minute | 1,440 / 1,440 | 17:49 UTC |
| `nightwatch-daily-summaries` | 23:00 daily | 1 / 1 | 23:00 UTC |
| `research-provider-health-retention` | 03:23 daily | 1 / 1 | 03:23 UTC |
| `tic-email-delivery-worker` | Every 15 minutes | 96 / 96 | 17:45 UTC |
| `tic-research-worker` | Every minute | 1,440 / 1,440 | 17:49 UTC |
| `tic-status-history` | Every 15 minutes | 96 / 96 | 17:45 UTC |
| `tic-webhook-retention` | 03:15 daily | 1 / 1 | 03:15 UTC |
| `tic-webhook-worker` | Every minute | 1,440 / 1,440 | 17:49 UTC |

`vercel.json` also schedules `community-media-retention` daily at 10:00 UTC. This baseline did not inspect its individual Vercel invocation history.

## Provider telemetry

The following 24-hour window was queried at **17:53 UTC** from `research_provider_health_events`. Counts are provider attempts, not user requests or end-to-end research success. The pre-migration rows explain the uncorrelated counts: all null `request_id` rows fall between 16:42 and 16:45 UTC, before the migration was applied at 17:07. All observed rows from 17:46–17:47 UTC had a request ID.

| Provider | Outcome | Attempts | With request ID | Mean duration | P95 duration |
| --- | --- | ---: | ---: | ---: | ---: |
| Gemini | HTTP error | 9 | 5 | 4,833 ms | 11,555 ms |
| Gemini | Invalid response | 1 | 1 | 4,177 ms | 4,177 ms |
| Gemini | Success | 1 | 0 | 8,045 ms | 8,045 ms |
| Gemini | Timeout | 1 | 0 | 9,001 ms | 9,001 ms |
| Qwen | Invalid response | 1 | 0 | 15,240 ms | 15,240 ms |
| Qwen | Timeout | 6 | 3 | 13,462 ms | 16,003 ms |

These counts are too small and are limited to recorded provider attempts; they do not establish a provider-wide reliability rate or research quality. The later correlated failures show request-level linkage is working, while the old rows remain uncorrelated by design. No request IDs, user IDs, prompts, source text, or provider payloads are included here.

## API usage and feature switches

The developer API usage table had no recorded requests in the 24-hour window queried at **17:50 UTC**. With no denominator, this provides no API error-rate estimate.

There is no central feature-flag registry in the repository. Code-level controls confirmed during this review:

- `TIDELIGHT_LIVE_ORDER_EXECUTION_ENABLED` must equal the exact string `true` before a live order can proceed; the policy defaults to fail-closed. The deployed value was not independently read. Keep it off unless separately authorized.
- `TIC_BITGET_MARKET_DATA_REDISTRIBUTION_ALLOWED` gates Bitget market-data redistribution in `lib/tic/market.ts`. Its deployed value and vendor-rights approval were not independently confirmed.
- System health exposes selected provider, Supabase, and scheduler configuration states, not private environment values. No secrets or raw environment values were inspected for this snapshot.

## Supabase advisories and limits

At **17:50 UTC**, health advisors returned no findings. Security advisors included 35 informational RLS-enabled tables without policies (including service-only tables), warnings for `pg_net` in `public`, three authenticated `SECURITY DEFINER` research-monitor overloads, and disabled leaked-password protection. Performance advisors reported six unindexed foreign keys and 52 unused indexes. These findings were reviewed as observations only; no database settings, policies, indexes, or functions were changed for this baseline.

This baseline does not establish the reason for the prior Vercel disablement, verify signed-in product flows, confirm deployed private flag values, or adjudicate provider/data licensing. Those remain explicit roadmap work.

## Follow-up checks · 18:31–18:36 UTC

Read-only HTTP checks at **18:31 UTC** returned HTTP 200 for `/api/system/health`, `/flow`, `/judge`, `/developers`, `api.tidelight.app/v1`, and `status.tidelight.app/health`. System health reported deployment `f24ef374b00f`, the PR #542 merge. This updates the deployment observation above; it still does not verify an authenticated journey.

Read-only Vercel project and deployment metadata showed the `f24ef374b00f95ff965d0d089ea42af23f4718be` main deployment in `READY` state with the production target, and `tidelight.app` verified on that project. A different historical project record lists the same host but reports it unverified. This metadata does not explain the historical `live: false` response or the 28 October HTTP 402, and does not establish that the historical project serves production. No aliases, deployments, project settings, or secrets were changed.

At **18:34 UTC**, a read-only aggregate over the prior seven days of Nightwatch scheduled executions found 28 completed executions: 17 `no_action` and 11 `rejected`. All 28 had a matching `nightwatch_runs` row, matching captured schedule revision, and no linked `nightwatch_orders` row. Current linked schedules were enabled and not paused; none of the executions referenced a deleted schedule. The application logic records `no_action` and `rejected` without inserting a paper order. This is a dated natural-run reconciliation only; it does not establish the 90-day/100-eligible-decision supervised observation target or verify user-level balances.

At **18:39 UTC**, Supabase health advisors again returned no findings. Security and performance categories remained materially consistent with the earlier snapshot: 35 informational service-only/RLS-without-policy findings, the `pg_net` schema warning, three owner-facing research-monitor `SECURITY DEFINER` functions, and leaked-password protection disabled; six unindexed foreign keys and 51 unused indexes. These are advisory observations, not independently verified vulnerabilities. No settings, grants, policies, or indexes were changed.

At **19:00 UTC**, a metadata-only Vercel environment listing confirmed `AGENTKEY_API_KEY` targets production. The value was not decrypted or inspected. This establishes variable presence in project configuration, not validity of the credential or successful AgentKey tool execution.

At **19:02 UTC**, read-only requests returned HTTP 200 for the landing page, trading page, status health, REST API root, developer docs, MCP protected-resource metadata, package directory, and blog home. These are route-availability checks only; no authenticated REST/MCP call or visual browser review was made.

At **19:03 UTC**, `https://tidelight.app/trading` returned HTTP 200 and rendered the existing copy “Live exchange orders are disabled across this deployment.” This is public UI evidence for the rendered branch, not a direct read of the private live-order environment value; the code-level live-order guard remains the authoritative enforcement.
