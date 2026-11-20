# ADR 0007: Nightwatch and paper trading never turn an outage into a fill

## Status

Accepted

## Context

Scheduled paper checks and manual exits share one ledger. A missing model, a stale quote, or a retired cron path must not create an exchange order or a silent fill.

## Decision

- Compatibility for the retired daily Vercel cron: only due custom schedules are claimed, using the same leases and limits as the Supabase dispatcher. (`app/api/cron/nightwatch/route.ts`)
- Manual exits use a current verified ticker mark and a distinct UTC timestamp. They can close a position after a check on the same completed candle. (`app/api/futures/paper/route.ts`)
- A provider outage is not an AI HOLD. Leave the candle unlocked so the owner can retry after service recovers; only validated proposals enter the ledger. (`lib/futures-paper-agent.ts`)
- A provider outage is a recorded HOLD, never a paper fill or an exchange order. (`lib/nightwatch-agent.ts`)
- Leave eight seconds for the guarded tick/alerts and five for the HTTP response. (`lib/nightwatch-budget.ts`)
- A batch is visited once per batchCount days. Rotate on each visit so a shared divisor between the batch count and batch size cannot strand users. (`lib/nightwatch-budget.ts`)
- Only use for reads. A mutation must be awaited so it is never reported as deferred while the database may still be committing it. (`lib/nightwatch-budget.ts`)
- Validate the venue timestamp before using a quote for a manual paper exit. (`lib/nightwatch-exit-quote.ts`)
- Hypothetical mark-to-market loss relative to the supplied reference price. (`lib/paper-position-stress.ts`)

## Consequences

Code no longer repeats these constraints. Change the behavior only by updating this record and the implementation together. Applied migrations under `supabase/migrations/` are not rewritten.
