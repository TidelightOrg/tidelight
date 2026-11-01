# Decision Intelligence Phase 0 Audit

**Observed:** 1 November 2026  
**Production source:** `0aa3e4e4357694a2ba97272186c093862d758076` (`main`)  
**Scope:** Existing Research, Agent Flow, Strategy Lab, Nightwatch, market adapters, storage, public replays, and developer interfaces. This is an implementation map, not an institutional-quality certification.

## Production baseline

The Vercel production deployment for `tidelight.app` was `READY` at the source SHA above. Read-only smoke requests returned HTTP 200 for `/judge`, `/api/system/health`, and `status.tidelight.app/health`. At the health snapshot, Bitget reported an available universe of 3,516 instruments, including 3,017 Reality instruments; Qwen, Supabase, and the Nightwatch scheduler were reported as configured. “Configured” is not a provider reachability or service-level guarantee. The health endpoint exposed a 12-character deployment SHA prefix; Vercel deployment metadata supplied the full source SHA recorded above. No AI request, account mutation, or paper tick was made for this audit.

On the exact production SHA above, a clean dependency install was followed by `npm test` (335 passed), `npm run build` (75 routes generated), `npm run typecheck`, and `npm run lint` (zero errors, 14 existing warnings). The benchmark has operational captures but no independently adjudicated quality score. Its 95% quality-gated completion target is not measured or achieved.

## Implemented flow and integration points

| Subsystem | Current flow and durable record | Existing controls and limits |
| --- | --- | --- |
| Research / Agent Flow | `POST /api/research/agent-flow` authenticates with Supabase, classifies a supported issuer or dated macro question, gathers issuer evidence through bounded public feeds and optional AgentKey search (or official Fed/BLS and independent macro sources), fetches Bitget context for issuer questions, then requests source-bound JSON from Qwen, with Gemini as a fallback when configured. Authenticated runs write `research_runs` and flat `research_sources`; streamed stages are returned to the Research desk. | Source dates and exact URLs are retained; sources are bounded and aged; model output is schema checked and citations are checked against supplied URLs; failures can produce an explicit source-only result; confidence, source diversity, freshness, completed-candle strategy checks, and policy gates can block a handoff. AgentKey is read-only, time- and budget-bounded, and can degrade to public feeds. Current source passages are partial excerpts, not a full web archive or complete filing corpus. |
| SEC and issuer fundamentals | `lib/sec-fundamentals.ts` retrieves SEC submissions and XBRL company facts for `/api/market/assets/[symbol]/fundamentals`; `lib/source-starters.ts` provides filing links. | This is a separate market/fundamentals path. Agent Flow does not currently pass SEC facts or filings into its evidence-bound synthesis automatically. |
| Instrument and market data | `lib/bitget-market.ts` resolves Bitget Reality spot assets, US-stock perpetuals, issuer identities, sessions, quotes, and candles. Agent Flow treats an rToken as a separate instrument and obtains stock-perpetual context independently. | Provider timestamps, instrument type, session metadata, and stale/unavailable states are available. The current shared research-to-risk path does not calculate order-book execution capacity, market impact, funding-aware overnight costs, or liquidation distance. |
| Strategy Lab | `/api/strategies/backtest` loads completed Bitget candles, fingerprints the dataset, runs the selected deterministic strategy, chronological train/holdout evaluation, walk-forward analysis when history permits, and cost sensitivity; it stores `strategy_backtest_runs` with parameters, candles, metrics, and an optional `researchRunId`. | Future candles are excluded and costs are explicit, but the current model is not a complete instrument-specific execution model. Funding, margin, liquidation, order-book impact, corporate actions, and a broad baseline/placebo suite are not all represented. A profitable result alone does not demonstrate alpha. |
| Nightwatch | Signed-in `POST /api/nightwatch/tick` resolves only a Bitget Reality asset, loads completed 4-hour candles and owner-scoped paper context, optionally links an owner-visible research run, asks the model for a bounded proposal, then calls the deterministic `nightwatch_tick` database function to record the decision and any allowed paper action. Schedules, alerts, replay records, and emails use separate worker/routes. | The database owns idempotency, freshness, pause, position/loss/fill limits, and ledger writes. Model failure is a recorded HOLD. The model cannot submit an exchange order. A complete, independently reconciled research-to-outcome production cycle is not established by the current smoke record. |
| Public research and replays | Public replay routes expose bounded, read-only snapshots; share-token routes expose only explicitly published records. Judge Mode is a public page. The current production Agent Flow still requires an account; the guest research implementation is in PR #445 and is not part of the deployed SHA above. | Static examples are labeled separately from live results. Private research, paper ledgers, credentials, and account context remain owner-scoped. Guest research is designed to stay read-only and session-only; its code and migration must pass review and deploy before the production journey can be claimed. |
| Developer platform | `/api/v1` exposes versioned market and durable research-job contracts; scoped API credentials, organization roles, quotas, and usage are backed by Supabase. `/api/mcp` exposes the supported MCP tools with API-key/OAuth authorization; webhooks and TypeScript/Python/React/CLI clients are separate versioned surfaces. | Developer credentials are distinct from user cookies; market scopes do not unlock trading. MCP/OAuth and package checks exist, but adding a new decision record requires explicit REST, MCP, and SDK contract work rather than implicit sharing through UI state. |

## Architecture gap and extension contract

The system already has useful source, strategy, and Nightwatch records, but the chain is connected by route parameters and embedded JSON rather than a shared durable decision context. Research sources are flat rows; claims, counterclaims, issuer/instrument exposure, scenarios, risk checks, approvals, and later outcomes do not yet form one typed evidence graph. SEC fundamentals are not automatically joined to Agent Flow. Provider attempt events and an operator health view exist, but provider selection is not health-aware and there is no circuit breaker. Research completeness, retrieval success, synthesis success, and independently measured answer quality must remain separate states.

Build the next shared layer incrementally on existing tables and contracts:

1. Reuse the research-run identifier for continuity, and introduce a separate durable workflow identifier only when a handoff spans multiple subsystems.
2. Give source passages, claims, hypotheses, issuers, instruments, market observations, risk assessments, and outcomes stable typed IDs; every observation must retain `observedAt` and, when applicable, `publishedAt` or `asOf`.
3. Make handoffs carry a versioned snapshot of validated facts and limitations. Reject missing, stale, or owner-inaccessible context before strategy or Nightwatch consumes it.
4. Keep the decision record append-only for later outcomes; add cryptographic capsule verification after evidence and ownership boundaries are established.

## Safe implementation sequence

1. **Close Phase 1 quality instrumentation:** finish the frozen, independently labeled benchmark and health-aware provider routing. Report source retrieval, valid synthesis, factual support, completeness, freshness, contradictions, and latency separately. Do not publish a quality rate until reviewers adjudicate it.
2. **Build Phase 2 evidence/context handoff:** add typed evidence and workflow lineage; integrate SEC facts where they support a claim; retain historical-as-of boundaries.
3. **Build Phase 3 execution/risk services:** identify exact instrument types and require fresh market depth, fees, contract specifications, funding, and portfolio limits before producing feasibility estimates.
4. **Extend Strategy Lab, then Nightwatch:** use the same evidence snapshot and deterministic risk interface; preserve current strategies and paper-only enforcement.
5. **Add Decision Capsules after the upstream records are stable:** snapshot inputs at decision time, append later outcomes, and separate integrity verification from prediction evaluation.

### Acceptance gates carried forward

- Every handoff is reproducible from a versioned evidence snapshot, exact instrument identity, and as-of market data.
- Any provider or source failure is visible and cannot become a successful research status by fallback alone.
- Strategy experiments store code/version, dataset fingerprint, costs, split, and result; no alpha label is emitted without suitable out-of-sample and baseline evidence.
- Nightwatch decisions remain paper-only and every action or veto is enforced and recorded outside the model.
- The benchmark reports measured results only; the 95% target remains pending until the independent evaluation suite passes its quality gate.
