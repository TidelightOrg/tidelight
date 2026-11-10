# Tidelight operations runbook

## Service status

- `/systems` is the branded operator view.
- `GET /api/system/health` returns a request ID, deploy SHA, response time, Bitget snapshot age and coverage, and provider configuration flags. “Configured” does not claim an upstream health probe, cron execution, or SLA.
- Bitget market endpoints show stale or unavailable states rather than replacing failed live data with sample values.
- Vercel runtime logs should be searched by route and time. Correlate a user-visible research or strategy artifact with its returned run ID; Nightwatch persists the run ID on every decision.

## Nightwatch scheduled paper checks

The scheduled path is configured for 09:00 UTC once daily and is opt-in per signed-in account and one Reality pair. Hobby timing precision is per-hour, so the invocation may begin from 09:00 through 09:59 UTC. Every run fetches the latest completed four-hour Bitget candle, then Postgres rechecks the current opt-in, selected symbol, pause state, owner link, duplicate key, feed freshness, loss cap, position cap, and daily fill limit. It uses the existing paper ledger. No exchange order API is called.

Required production environment:

| Variable | Where to get it | Vercel target |
|---|---|---|
| `CRON_SECRET` | Already present on the Tidelight Vercel project | Production |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Tidelight project → Project Settings → API Keys → Legacy anon, service_role API keys → copy `service_role` | Sensitive, Production only |

Never prefix the Supabase service-role key with `NEXT_PUBLIC_`, commit it, paste it into a browser client, or send it to a third-party provider. The product owner reports that this key has been added to Vercel. After the next production deployment, confirm `/api/system/health` reports the scheduler configured. Then opt in on Nightwatch. The schedule remains disabled in the UI until both server secrets are present.

The Vercel Hobby-compatible schedule is once per day at 09:00 UTC, with per-hour timing precision (the run may begin from 09:00 to 09:59 UTC). This lowers automated observation cadence; users can still run manual checks at any time. Vercel Cron invokes production deployments only. See [Vercel Cron usage and pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing) and [securing cron jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

## Backup and recovery

No production restore has been performed. Before calling recovery rehearsed, use an isolated staging project or branch, restore a recent backup there, check migrations and owner-scoped reads, and record restore time and data-loss point. Do not restore over production as a test. The Supabase project owner must confirm available backup retention and restore options in the project dashboard because they depend on the current plan.

## Live order switch

One server switch controls real Bitget orders: `TIDELIGHT_LIVE_ORDER_EXECUTION_ENABLED`. Only the exact value `true` allows them. A missing value, `false`, or any other string fails closed. Do not add a second flag.

The same check runs in the spot order route, the futures live-order route, live credential setup, and futures live access/account reads. `bitgetPrivateRequest` applies it again before any live-credential write, so a new caller cannot skip it. A refused live spot or futures order returns the disabled message and writes a `security_events` row with `event_type` `bitget_order_attempt` and metadata `blocked: true`, `reason: live_execution_disabled`.

Demo spot orders are intentionally outside this switch. A connected demo key still sends a confirmed order to Bitget with the `paptrading: 1` header. Those orders use Bitget's virtual-funds demo environment. Nightwatch, the futures paper ledger, REST v1, MCP, webhooks, cron, and server actions do not call the private order API.

To stop live orders, unset the variable or set it to anything other than `true`, then redeploy. Cancelling an order that already reached Bitget has to be done at Bitget while the switch is off.

## Incident response

1. Pause the user's Nightwatch paper agent from its control surface. Live Bitget orders are already refused unless `TIDELIGHT_LIVE_ORDER_EXECUTION_ENABLED` is exactly `true`.
2. Check `/systems` for stale providers and note the request ID and deploy SHA.
3. Check Vercel function logs for the relevant route; never include API keys or authorization headers in logs.
4. If a market source is stale or unavailable, stop manual checks until current completed candles return.
5. Preserve the research run, candle fingerprint, Nightwatch decision and operator action IDs before changing configuration.
6. For account isolation or unexpected paper-ledger writes, disable the scheduled secret in Vercel and inspect the corresponding Supabase audit records before resuming.

### Research provider health telemetry

Provider routing reads recent health events with a 300 ms deadline. If the store is unavailable or the read does not settle, routing keeps the configured provider order. Health-event writes have a 1.5 second deadline and cannot prevent a research result from saving. The deadline also aborts the store request; a transport that ignores cancellation may still finish later, so these events are operational observations rather than a transactional audit log.
