# ADR 0009: The developer platform keeps credentials, quotas, and business logic on the host

## Status

Accepted

## Context

Public MCP and SDK packages are adapters. Authentication, tenant checks, and provider access stay in the application that holds the credentials.

## Decision

- New messages remain visible in the authenticated admin inbox. (`app/api/developer-support/tickets/[ticketId]/messages/route.ts`)
- Replies remain visible in the authenticated requester inbox. (`app/api/developer-support/tickets/[ticketId]/messages/route.ts`)
- The conversation remains available in the admin inbox if email delivery is unavailable. (`app/api/developer-support/tickets/route.ts`)
- Probe WebGL2 first so unsupported browsers keep the static constellation without Three.js emitting a renderer initialization error. (`app/developers/packages/package-orbit-3d.tsx`)
- Paint a still frame immediately; animation starts only while visible. (`app/developers/packages/package-orbit-3d.tsx`)
- The same confirmed identities permitted by the existing operator policy receive an alert. Do not include ticket content in the email itself. (`lib/email/developer-support.ts`)
- Validate untrusted persisted/provider JSON before it reaches the trusted component registry. (`lib/intelligence-ui.ts`)
- Trusted component registry selection is derived from validated fields, never model-authored component names. (`lib/intelligence-ui.ts`)
- Build market handoffs only from exchange-verified symbols returned with the research snapshot. (`lib/intelligence-ui.ts`)
- Validate shared parameters for REST, the API explorer, and MCP adapters. (`lib/tic/market-query.ts`)
- Apply the ticker filter before pagination so a matching instrument is not hidden by earlier symbols. (`lib/tic/market-query.ts`)
- Bitget market data must not be redistributed through developer products unless Tidelight has confirmed a written license that permits it. (`lib/tic/market-terms.ts`)
- Forward only the platform client-IP header used by the shared rate limiter. (`lib/tic/mcp-client-ip.ts`)
- The protocol/tool implementation is public and maintained in the canonical MCP component. Host authentication, tenant checks, quotas, and invocation adapters remain private to this application. (`lib/tic/mcp-protocol.ts`)
- Blog content has a dedicated host with concise article URLs. Keep shared static assets and Next's internal assets on their original paths. (`lib/tic/service-host-routing.ts`)
- Record the latest authenticated worker result without changing the worker response. (`lib/tic/worker-health.ts`)
- Availability checks must never prevent the underlying worker response. (`lib/tic/worker-health.ts`)
- Uses the OS credential store. Linux requires Secret Service (for example GNOME Keyring or KWallet). (`packages/cli/src/credential-store.ts`)
- Create the public Tidelight MCP tool server around a host-provided invoker. Authentication, tenant isolation, quotas and provider access belong to the host. (`public/components/mcp/server/src/index.ts`)
- Checks that a public copy matches its stated SHA-256; this does not establish source truth or authorship. (`sdk/typescript/src/index.ts`)
- Node cannot directly import the generated TypeScript module; load the validated source entries from the same manifest reader used to produce it. (`tests/developer-package-catalog.test.mjs`)

## Consequences

Code no longer repeats these constraints. Change the behavior only by updating this record and the implementation together. Applied migrations under `supabase/migrations/` are not rewritten.
