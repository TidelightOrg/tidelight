# ADR 0004: Sessions are verified in the proxy, and privileged reads stay owner-scoped

## Status

Accepted

## Context

The browser is not a source of identity. Service-role access exists only where table grants cannot express the read, and every such read still filters to the verified user.

## Decision

- MCP clients may omit `scope` during dynamic client registration. Default them to the scopes this server actually exposes so research tools are not silently hidden after OAuth (the consent screen still requires explicit approval and a project key with these scopes). (`app/api/oauth/register/route.ts`)
- Authenticated changes must not reveal internal mail or provider state to the caller. (`app/api/security/notification/route.ts`)
- Numeric codes require an email template that renders {{ .Token }}. Keep this hidden until that template is configured so users are never sent a link-only email. (`app/login/page.tsx`)
- Numeric email OTP verification stays on this page. Supplying a redirect URL here makes Supabase validate it against the Auth redirect allow-list even though the user never follows a magic link, which can reject code requests. (`app/login/page.tsx`)
- Use only a Supabase Auth user returned by getUser() on the server. (`lib/auth/operator-access.ts`)
- Service-role access is isolated to protected server jobs. Never import in a client component. (`lib/supabase/admin.ts`)
- Read the verified user identity forwarded by Proxy, or verify cookies directly. (`lib/supabase/auth-user.ts`)
- The signed access token does not always include email_confirmed_at. Re-read only allowlisted operator identities from Auth before applying the operator gate; never infer confirmation from the email claim alone. (`lib/supabase/auth-user.ts`)
- Supabase SSR stores auth cookies as one cookie or numbered chunks. (`lib/supabase/legacy-cookie-migration.ts`)
- Only the primary app origin can safely move the old shared session to its own host. (`lib/supabase/legacy-cookie-migration.ts`)
- Read raw Cookie header pairs before Next's cookie map collapses duplicate names. (`lib/supabase/legacy-cookie-migration.ts`)
- retain the raw value (`lib/supabase/legacy-cookie-migration.ts`)
- Do not let a pre-refresh request cookie overwrite a token just refreshed by Supabase. (`lib/supabase/legacy-cookie-migration.ts`)
- Verify cookies in Proxy only for app page requests. API handlers verify their own sessions. (`lib/supabase/proxy-auth-policy.ts`)
- Server components cannot write cookies; proxy refreshes the session. (`lib/supabase/server.ts`)
- Minimize identity data forwarded from Proxy after Supabase validates the JWT. (`lib/supabase/verified-auth-claims.ts`)
- Decode only the compact identity snapshot emitted by the trusted Proxy. (`lib/supabase/verified-auth-claims.ts`)
- parseOAuthScopes checks against TIC_OAUTH_SCOPES by default. (`lib/tic/oauth.ts`)
- Generate a fresh server-side correlation ID for every request. Never use a caller-supplied value, which could be used to forge or collide with logs. (`proxy.ts`)
- Never trust an identity header supplied by the browser. It is populated below only after Supabase has verified the request's signed access token. (`proxy.ts`)
- Supabase SSR needs a request proxy to refresh expired access tokens and persist the refreshed cookie before server components read the session. Keep this on the primary app host, which owns the signed-in workspace. (`proxy.ts`)
- getClaims verifies the token and refreshes it when needed. Never use getSession here: it trusts the cookie without validating the JWT. (`proxy.ts`)
- Older releases scoped Supabase refresh tokens to .tidelight.app, which also sent them to docs.tidelight.app (GitBook). Migrate the same session to the first-party app host, then expire the parent-domain cookie. (`proxy.ts`)
- Always clear parent-domain copies. When a name is duplicated, leave the first-party value untouched and skip auth refresh for this request. (`proxy.ts`)
- Create a local stdio-compatible MCP server which forwards discovery and tool calls to Tidelight's hosted MCP service. Authorization and scopes stay on the hosted service; this adapter does not duplicate Tidelight business logic. (`public/components/mcp/server/src/proxy.ts`)

## Consequences

Code no longer repeats these constraints. Change the behavior only by updating this record and the implementation together. Applied migrations under `supabase/migrations/` are not rewritten.
