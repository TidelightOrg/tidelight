# ADR 0006: Decision capsules are immutable and decision records only reference them

## Status

Accepted

## Context

A decision record is a read-only index of records the owner already has. It does not copy snapshots, replay payloads, or private excerpts into a second store.

## Decision

- Idempotency under concurrent requests: only disclose this owner's capsule. (`app/api/decision-capsules/route.ts`)
- Format disclosed prices without the three-digit fractional rounding default. (`lib/decision-capsule-format.ts`)
- Summarize a server-verified event chain. User-entered observations stay explicitly descriptive. (`lib/decision-capsule-outcomes.ts`)
- New projections record this version. Policy 2 stays frozen so stored copies keep their original rules. (`lib/decision-capsule-public.ts`)
- Builds a public allowlist projection; private owner, run, source and event-storage IDs are excluded. (`lib/decision-capsule-public.ts`)
- Verifies the disclosed projection and its re-keyed public event chain without exposing storage IDs. (`lib/decision-capsule-public.ts`)
- Bind owner confirmation to disclosed bytes and the private history head, even if events stay private. (`lib/decision-capsule-public.ts`)
- True only while a pending capsule save still belongs to the currently displayed research run. (`lib/decision-capsule-save-scope.ts`)
- Canonical JSON for durable integrity checks: object keys sort recursively; array order is retained. (`lib/decision-capsules.ts`)
- Snapshot saved inputs as observed; does not add predictions, outcomes, or inferred facts. (`lib/decision-capsules.ts`)
- A linked read failed. Callers must not present that as an empty record. (`lib/decision-record.ts`)
- One row, or a page of rows, from a user-scoped or capsule read. (`lib/decision-record.ts`)
- Query methods the resolver calls. Production passes a Supabase client. (`lib/decision-record.ts`)
- Signed-in client for owner tables. Capsule reads use the server role because authenticated has no table grant. (`lib/decision-record.ts`)
- Research run fields shown on the record. The id is the continuity key. (`lib/decision-record.ts`)
- Capsule id and time. The snapshot stays on the capsule row. (`lib/decision-record.ts`)
- Strategy backtest identity, including the saved market. (`lib/decision-record.ts`)
- Paper decision identity. The outcome is the recorded action. (`lib/decision-record.ts`)
- Owner-scoped source citation. Excerpts and query strings are deliberately omitted. (`lib/decision-record.ts`)
- Owner-scoped claim summary. Supporting quotes are deliberately omitted. (`lib/decision-record.ts`)
- Bounded identity trace projected from the existing saved evidence graph. (`lib/decision-record.ts`)
- One page of linked rows. `earlier` is the cursor for the next older page. (`lib/decision-record.ts`)
- Optional cursors. Each linked list pages on its own. (`lib/decision-record.ts`)
- Existing public link metadata only. The replay payload is deliberately never selected. (`lib/decision-record.ts`)
- Owner's existing Nightwatch settings linked to this research run. (`lib/decision-record.ts`)
- Owner-scoped references. The stable id is the research run while that run exists. (`lib/decision-record.ts`)
- Read-only links into the existing desks. Invalid symbols are not linked. (`lib/decision-record.ts`)
- Accept only an ISO timestamp cursor. Any other value is ignored. (`lib/decision-record.ts`)
- Next older page of one list, keeping the other lists' cursors. (`lib/decision-record.ts`)
- Read this owner's research, capsule, strategy, and Nightwatch ids. Does not copy snapshots or write. Returns null when this owner cannot see the id. (`lib/decision-record.ts`)
- Canonical JSON shared with the server capsule hash: sorted object keys, ordered arrays. (`lib/public-capsule-integrity.ts`)
- Independently verify a disclosed capsule snapshot in a browser or WebCrypto runtime. (`lib/public-capsule-integrity.ts`)
- Validate the public response envelope and verify its disclosed snapshot. (`lib/public-capsule-integrity.ts`)

## Consequences

Code no longer repeats these constraints. Change the behavior only by updating this record and the implementation together. Applied migrations under `supabase/migrations/` are not rewritten.
