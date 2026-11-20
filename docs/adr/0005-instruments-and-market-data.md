# ADR 0005: Instrument identity comes from the provider catalog

## Status

Accepted

## Context

A ticker string is not an instrument. Reality spot, listed perpetuals, and equity sessions are different products with different history endpoints and freshness rules.

## Decision

- Reality spot tokens do not have a Bitget /market/candles history endpoint. Use a separately identified stock perpetual reference only where Bitget actually lists the corresponding contract. (`app/api/market/radar/route.ts`)
- Server receipt time for the current provider observation, in epoch milliseconds. (`lib/bitget-market.ts`)
- Exact provider status when present; null means the catalog omitted it. (`lib/bitget-market.ts`)
- Bitget response clock when the provider supplies it. (`lib/bitget-market.ts`)
- Ticker logos preserve issuer branding when a company domain is not in our curated map. Do not send token contract/base symbols to a coin logo service. (`lib/bitget-market.ts`)
- Keep the live quote count distinct from Bitget's instrument catalog. A listed pair can be temporarily offline or lack a valid current ticker. (`lib/bitget-market.ts`)
- Latest actual Bitget public fill; ticker `ts` only marks ticker generation time. (`lib/bitget-market.ts`)
- Futures are a separate verified US-stock contract universe, never inferred from an rToken prefix. (`lib/bitget-market.ts`)
- Best displayed prices must come from levels that can contribute executable size. (`lib/execution-feasibility.ts`)
- Advance a server-timestamped snapshot clock by elapsed client time since the request began (a conservative upper bound on response transit). (`lib/execution-feasibility.ts`)
- Apply the same venue skew and snapshot age limits to book-derived prices and sweeps. (`lib/execution-feasibility.ts`)
- Return only the side(s) implied by the proposed paper action. (`lib/execution-feasibility.ts`)
- Sweep only the levels returned by the venue. Never extrapolate unseen liquidity. (`lib/execution-feasibility.ts`)
- Check venue skew at server receipt; use the advanced server clock for age. (`lib/execution-feasibility.ts`)
- Evaluate smaller and larger visible-book sweeps using identical snapshot assumptions. (`lib/execution-feasibility.ts`)
- Estimate only the next announced settlement. Positive cost means the position pays; negative means it receives. (`lib/execution-feasibility.ts`)
- Return only Reality spot instruments present in the provider catalog with a known underlying ticker. (`lib/exposure-map.ts`)
- Decision-capsule instrument classes. Evidence-graph `reality_tokenized_spot` names the same Reality spot leg. (`lib/instrument-identity.ts`)
- Normalize a verified SEC CIK without inventing issuer mappings. (`lib/instrument-identity.ts`)
- Stored names that already mean one of the canonical kinds. `rtoken` on a MarketAsset is Reality spot only when `isReality` is true. `getBitgetStockPerp` stores the same `rtoken` string with `isReality: false`. (`lib/instrument-identity.ts`)
- Three linked symbols. They are not the same product and not interchangeable prices. (`lib/instrument-identity.ts`)
- Quote age on the Bitget market universe and in research quote gates. (`lib/instrument-identity.ts`)
- Future skew in research quote gates. Nightwatch exit quotes use 5_000. (`lib/instrument-identity.ts`)
- Resolve a Bitget `MarketAsset` kind. A bare `rtoken` string is not enough for a stock perpetual. (`lib/instrument-identity.ts`)
- A Reality symbol is supported only when its provider catalog row identifies it as Reality spot. (`lib/instrument-identity.ts`)
- Link supplied symbols. An invalid supplied leg rejects the identity; an omitted leg stays unknown. (`lib/instrument-identity.ts`)
- Classify a provider timestamp. A missing quote is the caller's own `unavailable` state. (`lib/instrument-identity.ts`)
- SEC Company Facts exposes an acceptance date here, not a timestamp. Treat the as-of calendar day as unavailable because intraday ordering is unknown. (`lib/sec-fundamentals.ts`)
- SEC's fy/fp describe the filing that contains a fact. Retain these fields from the first eligible filing for this exact reporting interval so later comparative filings cannot rewrite its fiscal identity. (`lib/sec-fundamentals.ts`)
- Keep links that fit the persisted research-source contract, without discarding other results. (`lib/token-pulse-sources.ts`)

## Consequences

Code no longer repeats these constraints. Change the behavior only by updating this record and the implementation together. Applied migrations under `supabase/migrations/` are not rewritten.
