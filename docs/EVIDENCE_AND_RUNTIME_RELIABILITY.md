# Evidence packaging and runtime reliability

**Prepared:** 20 October 2026  
**Scope:** Judge-facing reproducibility and operational checks. No private account records or production secrets belong in this document.

## Evidence paths

- Public evidence index: `/evidence` and `/evidence/manifest.json`.
- Research replay: `/replay`. It is an explicitly labeled fixture, not a live source capture or result.
- Strategy runs: signed-in users can export an individual run from Strategy Lab. The JSON contains its completed candle input, fingerprint, split, costs, trades, metrics and saved baseline summaries. It is a reproducibility artifact, not evidence of positive alpha.
- Strategy baselines: each new run compares its untouched holdout with buy-and-hold, a fixed 20/10 channel momentum rule, and 100 deterministic random long/cash placebo replays. Placebo transition probabilities are conditional on the prior cash/long training state; when training contains only one state, the placebo starts from that observed occupancy. Otherwise its initial state is randomized from the stationary occupancy implied by training transition rates. The first signal is eligible at the first holdout open, and the random seed is derived only from training candles. The reported 5th–95th percentile, median and share of placebo runs matching or exceeding the selected rule are descriptive comparisons, not significance tests. Placebo methodology version 4 identifies these semantics.
- Paper execution review: half-size and double-size scenarios sweep the same current visible book as the proposed entry or close. They are hypothetical, exclude fees and funding, and report incomplete depth or unavailable stale data rather than extrapolating hidden liquidity.
- Futures paper position stress uses the displayed timestamped reference mark to calculate hypothetical incremental losses for 5% and 10% adverse moves. These are not liquidation prices and exclude fees, funding and slippage. Marks older than 60 seconds, timestamps more than 5 seconds ahead, or invalid inputs prevent an estimate.
- Nightwatch: signed-in users can download the currently loaded decision, paper-order and position records from the private audit panel. The export is account data and should be reviewed/redacted before sharing. It is bounded to records loaded in the view; it is not a full archive.
- Research session data and paper ledgers remain owner-scoped. No public route publishes private user evidence.

## Reliability and security verification

The application CI workflow is the source of truth for code checks. Review its current run and commit SHA before claiming a pass. Database isolation tests exercise migration policy boundaries, privileged functions, refresh-token replay handling and Nightwatch invariants. These tests validate the migrations against isolated databases; they do not constitute a production penetration test.

Production verification must record the deployed commit and deployment state, then check public routes in a real browser. Check both direct navigation and links from Judge Mode. Inspect desktop and narrow-screen layouts, console/network errors, and verify that the public fixture never claims live data. Do not submit orders or alter account configuration as part of route checks.

## Runtime findings workflow

Research synthesis logs a bounded validation reason when parsed model JSON fails the assessment contract. The reason identifies the failing field or a missing assessment, without logging the research question, source text, ticker, or model output. Provider timeout, HTTP, parsing, and schema outcomes remain separate; a validation failure still produces a source-only result and cannot unlock trade review.

1. Review current Supabase security/performance advisors and Vercel deployment/runtime logs using read-only access.
2. Record each finding with source, severity, affected route/object, reproducible evidence, and whether it is production-confirmed.
3. Fix only findings with an understood impact and a regression test; avoid broad policy changes without a verified access-control defect.
4. Re-run CI and the affected route/data-path checks.
5. Keep unresolved provider outages, environment-specific advisories, and limits explicit; never label them “fixed” without post-change evidence.

## Known limits

- Strategy report figures are historical and are not an alpha guarantee. Perpetual funding, margin/liquidation, dividends, issuer actions, and order-book liquidity are outside the current model.
- The static replay is a UX explanation only. A real research run requires the authenticated research flow and live provider access.
- Nightwatch exports are user-initiated, local downloads, not a public judging artifact or signed/audited ledger.
- A passing migration test or CI run is not a substitute for checking the live deployment and current production advisories.

## Live project advisor snapshot

Read-only Supabase advisor checks for project `plmdnzbmvgigkzfmfwov`, observed 20 October 2026:
- Security: 23 tables have RLS enabled without explicit policies (INFO); this can be intentional for service-role-only tables and must be checked against grants and server access before changing.
- Security: `pg_net` in `public` (WARN), remediation: https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public
- Security: leaked-password protection disabled (WARN); enable through the Supabase Auth security settings after product-owner review.
- Performance: 53 unused-index notices (INFO); do not drop indexes based on a fresh/low-volume project snapshot alone.

These are live dashboard findings, not conclusions that the app is exploitable. Resolve each table’s grants, access path, and intended service-role boundary; then change policies only with a verified test. Track configuration-only warnings separately from code/migration findings.
