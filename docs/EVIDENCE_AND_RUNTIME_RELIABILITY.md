# Evidence packaging and runtime reliability

**Prepared:** 20 October 2026  
**Scope:** Judge-facing reproducibility and operational checks. No private account records or production secrets belong in this document.

## Evidence paths

- Public evidence index: `/evidence` and `/evidence/manifest.json`.
- Research replay: `/replay`. It is an explicitly labeled fixture, not a live source capture or result.
- Strategy runs: signed-in users can export an individual run from Strategy Lab. The JSON contains its completed candle input, fingerprint, split, costs, trades and metrics. It is a reproducibility artifact, not evidence of positive alpha.
- Nightwatch: signed-in users can download the currently loaded decision, paper-order and position records from the private audit panel. The export is account data and should be reviewed/redacted before sharing. It is bounded to records loaded in the view; it is not a full archive.
- Research session data and paper ledgers remain owner-scoped. No public route publishes private user evidence.

## Reliability and security verification

The application CI workflow is the source of truth for code checks. Review its current run and commit SHA before claiming a pass. Database isolation tests exercise migration policy boundaries, privileged functions, refresh-token replay handling and Nightwatch invariants. These tests validate the migrations against isolated databases; they do not constitute a production penetration test.

Production verification must record the deployed commit and deployment state, then check public routes in a real browser. Check both direct navigation and links from Judge Mode. Inspect desktop and narrow-screen layouts, console/network errors, and verify that the public fixture never claims live data. Do not submit orders or alter account configuration as part of route checks.

## Runtime findings workflow

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
