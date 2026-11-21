# ADR 0012: Secrets stay server-side and local configuration matches production

## Status

Accepted

## Context

Example environment variables and the local Supabase config are operational contracts. A missing or public value must fail closed.

## Decision

- Server only: Supabase secret/service-role key for the protected Nightwatch scheduler. Never expose this with a NEXT_PUBLIC_ prefix. (`.env.example`)
- Shared bearer secret for authenticated Vercel Cron workers. (`.env.example`)
- Separate bearer secret shared only with Supabase Cron's TIC worker dispatch. (`.env.example`)
- Enable only after the Supabase email template displays its one-time code ({{ .Token }}). (`.env.example`)
- Optional comma-separated, exact HTTPS origins permitted to call the remote MCP endpoint from browsers. (`.env.example`)
- Leave false until written Bitget terms explicitly permit redistribution through developer API/MCP products. (`.env.example`)
- Optional secret for HMAC hashing OAuth rate-limit subjects; falls back to the server-only Supabase key. (`.env.example`)
- Server-only Resend API key for opted-in Nightwatch and account-security messages. Supabase Auth SMTP is configured separately in Supabase Auth settings. (`.env.example`)
- Optional server-only geolocation endpoint override. Tidelight defaults to ipapi.co and stores only approximate city/region/country context in security events. (`.env.example`)
- Server-only random 32+ character key for encrypting Bitget credentials (never expose with NEXT_PUBLIC_). Generate with: openssl rand -base64 32 (`.env.example`)
- Any other value, including a missing variable, fails closed. (`.env.example`)
- Build the public MCP stdio bridge from the mother repository source. (`public/components/mcp/server/Dockerfile`)
- The local database major version has to match the remote database. Check it with `SHOW server_version`. (`supabase/config.toml`)
- Refresh-token reuse is allowed only while refresh-token rotation is enabled. (`supabase/config.toml`)
- pg-delta is the schema diff engine. Set it disabled to fall back to the legacy migra engine. (`supabase/config.toml`)
- Path to JWT signing key. DO NOT commit your signing keys file to git. (`supabase/config.toml`)
- DO NOT commit your Twilio auth token to git. Use environment variable substitution instead: (`supabase/config.toml`)
- DO NOT commit your OAuth provider secret to git. Use environment variable substitution instead: (`supabase/config.toml`)
- `per_worker` (default) — enables hot reload during local development. `oneshot` — fallback mode if hot reload causes issues (e.g. in large repos or with symlinks). (`supabase/config.toml`)

## Consequences

Code no longer repeats these constraints. Change the behavior only by updating this record and the implementation together. Applied migrations under `supabase/migrations/` are not rewritten.
