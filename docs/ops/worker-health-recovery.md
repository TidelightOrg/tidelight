# Recovering Tidelight scheduled workers

Supabase Cron invokes the Tidelight worker routes with a bearer token stored in Supabase Vault. The production routes validate that token against the Vercel production environment variable `TIC_RESEARCH_CRON_SECRET`.

## Required production configuration

- Vercel production: `TIC_RESEARCH_CRON_SECRET`
- Supabase Vault: `tic_research_worker_secret`
- Supabase Vault: `tic_research_worker_url`, set to the production URL ending in `/api/cron/tic-research`

The bearer values for the first two entries must match exactly. Keep the bearer in Vercel's sensitive environment-variable storage and Supabase Vault; do not put its value in source control, build logs, or public configuration.

## Verification after a move or rotation

1. Update the Vercel production variable and the Vault secret as one coordinated change.
2. Redeploy the production project so server routes use the updated Vercel value.
3. Verify Supabase Cron responses for the research, webhook, status-history, Nightwatch schedule, and email worker routes. A `401 Unauthorized` response means the bearer values do not match or the deployed environment has not picked up the new value.
4. Check `https://status.tidelight.app/`. Research and webhook heartbeats should refresh within five minutes; scheduled paper analysis and email delivery use a 26-hour freshness window.
5. Check `https://status.tidelight.app/history` after the status-history worker runs. History storage availability is separate from the live checks.

Do not manually invoke a worker endpoint without the bearer or submit a production research job or trade just to validate configuration.
