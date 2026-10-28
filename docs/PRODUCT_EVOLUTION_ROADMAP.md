# Tidelight product evolution roadmap

**Canonical roadmap · updated 28 October 2026**

**Repository baseline inspected:** `TidelightOrg/tidelight` main, commit `3cae53869796c210352cae7246a44f77b6fcfdcc` (PR #435).
**Purpose:** turn Tidelight's current collection of research, strategy, paper-testing, and developer-platform capabilities into a trusted, evidence-led workstation for US equities and tokenized US equity products (rTokens).

> **Current production blocker:** Vercel reports the Tidelight project as `live: false`. Read-only requests to `tidelight.app/judge` and `status.tidelight.app/health` returned HTTP 402 `DEPLOYMENT_DISABLED` on 28 October 2026. The latest production deployment is marked READY, but the domains are not serving the product. Restore service and verify public routes before treating any feature or roadmap phase as production-ready.
>
> **Current trading-policy mismatch:** public product documentation says live trading is disabled and the product is paper-first. The repository nevertheless contains authenticated live Bitget Reality spot and US-stock-perpetual order handlers. Those handlers require user credentials, explicit confirmation, MFA, and—in the futures path—approved access and accepted terms, but this is not the same as a global off switch. Until the owner makes a separately reviewed decision, the product should keep live order execution globally disabled and make that state enforceable on the server.

## Executive direction

Tidelight should become an **evidence-to-rehearsal workspace**: a user follows an event, checks the evidence, understands which US company or rToken may be affected, tests a defined strategy against reproducible data, and reviews a controlled paper decision. The product should make the chain inspectable from question to decision. It should not turn a fluent AI answer into a trade instruction.

“Institutional grade” is a standard to earn through measured quality, controls, operational evidence, and independent review. It is not a visual style, a feature count, or a marketing claim. Tidelight can target the professional workflows institutions value—provenance, reproducibility, authorization, auditability, and resilience—without claiming that it is already institution-ready or that its strategies have alpha.

### Mission

Help people understand what changed in US equity and rToken markets by connecting dated evidence to transparent analysis and reproducible strategy experiments.

### Vision

Become the trusted research and strategy-testing home where a market participant can move from an overnight event to a reviewable paper decision without losing source, data, or risk context.

### Long-term goal

For every saved decision, Tidelight should be able to answer:

1. What question or event started the work?
2. Which exact sources and market observations were available at that time?
3. Which statements are sourced facts, which are analysis, and what evidence challenges them?
4. Which issuer, US equity, rToken, or perpetual contract was mapped—and why?
5. Which strategy version, data window, assumptions, costs, and risk checks were used?
6. What did the user accept, reject, or send to paper testing, and what happened next?

The product is successful when users return because they can **inspect and reproduce a useful decision record**, not because the app produces the most signals or the largest simulated return.

## Product definition

### Primary users

- **Self-directed market researchers** following US companies and tokenized representations outside normal equity-market hours.
- **Strategy researchers** testing rules against US-stock perpetual and rToken histories while learning where those instruments differ from ordinary US shares.
- **Risk-conscious paper testers** who want to observe how a rule or bounded agent behaves before considering any real-world action.
- **Developer and data teams** integrating Tidelight market and research capabilities through the REST API, MCP, webhooks, and SDKs.

These are related users, but they do not all need the same landing screen. Research, strategy experiments, paper decisions, and developer integrations should remain distinct workspaces connected by a common decision record and shared evidence model.

### Core workflow

`Event or question → evidence capture → source review → issuer/instrument exposure → as-of market context → scenarios → strategy replay → paper review → human decision`

A handoff may carry context forward, but it must not silently start a backtest, schedule an agent, connect an account, or place an order.

### Product principles

1. **Evidence before synthesis.** A claim is only as trustworthy as its cited source passage, date, and relevance.
2. **Facts and interpretation stay distinct.** Show sourced facts, market observations, model analysis, and user decisions as different things.
3. **Instrument identity matters.** An issuer share, Bitget Reality rToken, and USDT stock perpetual are not interchangeable.
4. **As-of reproducibility.** Replays use the data and strategy version available at the recorded time, including revisions and freshness.
5. **Negative results stay visible.** A weak or losing experiment is valid output; do not tune to one period or hide a failed test.
6. **Automation proposes; deterministic controls decide.** An AI model cannot bypass limits, freshness checks, permissions, or an explicit user decision.
7. **Paper is the default.** Real order routes remain unavailable unless a separate owner-approved, legally reviewed, security-reviewed program explicitly enables them.
8. **Missing evidence is visible.** No data, stale data, provider failure, and unreviewed output must not be styled as a pass.
9. **Privacy is scoped.** Private research, workspace records, credentials, and paper ledgers remain tenant-isolated and auditable.

## What exists today

The inventory below is based on the current repository, its implementation and evaluation notes, and a read-only production check. “Built” means the capability exists in source. It does not automatically mean it is available in production or has passed an institutional-quality review.

| Area | Built in the product | Current evidence and limits |
|---|---|---|
| **Market workspace** | Market map and instrument details, Bitget spot/Reality and US-stock-perpetual instrument paths, public quotes/candles, company context, fundamentals/SEC-related paths, watchlists, and market-session context. | Provider timestamps and instrument distinctions exist. Redistribution rights for the intended public use still need written confirmation. Historical depth and token-specific market quality vary by instrument. |
| **Research desk** | Source-bounded research, issuer/SEC starters, Mini and Pro capture limits, quote-linked claims, supporting/counter-evidence fields, confidence and freshness context, exposure mapping, saved briefs, public replays, and Research Monitor. | A ten-event frozen set has production outputs for all ten events, but AI synthesis appeared in only two captured runs. This is an operational capture, not a quality score. Two-reviewer claim labels and adjudication are not complete; accuracy is therefore unmeasured. Some captured runs lacked useful sources or returned stale, single-source, or potentially irrelevant content. |
| **Research orchestration** | Agent Flow coordinates market checks, source discovery, research assessment, deterministic strategy checks, and gated handoff links. Durable research jobs, cancellation, idempotency, workers, quotas, and source-labeled snapshots exist for the developer API. | Production job lifecycle and API/MCP flows have been exercised in earlier evidence. The complete positive Research → Strategy → Nightwatch path has not been proven with a fresh run that clears the evidence gate. The gate should remain strict. |
| **Strategy Lab / Alpha Factory** | Deterministic SMA 20/50 baseline, chronological training/holdout split, configured fees and slippage, disjoint trailing evaluation windows when data permits, cost stress, completed-candle fingerprints, trade logs, and JSON exports. Market paths include Reality rTokens and stock perpetuals. | Five instruments in the 5 October diagnostic all underperformed same-window buy-and-hold after configured costs. That is evidence against an alpha claim, not against continuing research. Perpetual funding, margin, liquidation, contract specifications, order-book impact, session-aware execution, issuer actions, and token-specific liquidity are not fully represented. |
| **Nightwatch paper decisions** | Paper decisions and fills, owner-scoped records, research lineage, guardrails, pause controls, daily limits, stale-data checks, duplicate suppression, and configurable scheduled reviews. | Database and scheduler safeguards exist. A representative, supervised production observation period with an independently reconciled audit remains open in the latest roadmap record. Re-check current schedule/run evidence before declaring it complete. |
| **Futures paper desk** | A separate paper account for US-stock perpetuals, simulated entries/exits, a one-position/1× model, fixed fee/slippage assumptions, position and loss caps, and paper-ledger persistence. | It is a learning simulator. It does not fully model funding, margin, liquidation, contract multipliers, mark-price rules, exchange sizing, market impact, or gap execution. Paper P&L is not exchange P&L. |
| **Developer platform** | Versioned REST API, owner/org-scoped projects and credentials, quotas and usage records, durable research jobs, webhooks with signatures/retry history and destination checks, Streamable HTTP MCP with scoped tools and OAuth/PKCE, OpenAPI, docs, operator/support workflows, and TypeScript/Python and other package surfaces. | Package install evidence exists for version 0.1.2 in the public README. Keep compatibility, release ownership, client-by-client MCP claims, support SLAs, and provider data rights explicit. Billing/credits are not backed by measured costs and real payment configuration. |
| **Identity and controls** | Supabase Auth, owner-scoped RLS, organization roles, API scopes, audit records, credential protection, MFA/passkey surfaces, and operator allowlisting. | These are useful foundations, not a security certification. Complete a current grant/RLS review, security threat model, restore rehearsal, and independent penetration review. Some implementation notes are older than the current main commit. |
| **Status and communications** | Live component checks, scheduled status snapshots, detected incidents, 90-day history, maintenance notices, email subscriptions, RSS/Atom, Slack instructions, and an operator communications home. | The public status host recently had an incident-page rendering bug, fixed in PR #433. More critically, current Vercel project metadata says `live: false` and public routes return 402, so the current site is unavailable until platform service is restored. |
| **Product experience** | Branded landing, overview, research, markets, watchlist, strategies, Nightwatch, futures paper, community, guide/demo, developer portal/docs, themes, notifications, blog, status, and support pages. | The surface area is broad. The next phase should make the core workflow easier to understand and finish, not add more top-level destinations. The connected end-to-end journey and mobile experience need current production verification after availability is restored. |

### Important evidence—not marketing claims

- The ten-event research capture log reports **10/10 captured runs**, with AI synthesis in **2/10**. This is capture availability only; no claim-level quality rate has been adjudicated.
- The 5 October Strategy Lab diagnostic showed negative strategy returns on AAPL, NVDA, TSLA, BTC, and ETH, all below same-window buy-and-hold after the configured costs. It is a single dated diagnostic and not a broad strategy study.
- CI, migration tests, and prior production journeys provide meaningful engineering evidence. They do not substitute for current production availability, data rights, independent research labels, an audited strategy study, a supervised paper period, or third-party security review.
- Current production check on 28 October: latest Vercel deployment `dpl_7C42qAwZZZixf7Q7Tjd76EdZHWUR` is marked READY at commit `3cae538`; the project metadata says `live: false`, and public requests returned 402 `DEPLOYMENT_DISABLED`. This is an owner/platform availability issue to resolve before measuring product adoption.

## Roadmap at a glance

The schedule is a dependency order, not a date promise. Durations assume a small cross-functional team and may expand materially if one person is doing product, engineering, research, security, and operations. Start the next phase only when its gate is met.

| Phase | Target window | Main outcome | Exit gate |
|---|---:|---|---|
| **0 · Restore and establish a safe baseline** | Now / first week | Public product is reachable; trading policy is unambiguous and enforced. | All intended public domains serve the current commit; health and critical user journeys pass; live execution is off by server-side default unless formally approved. |
| **1 · One coherent decision workspace** | Weeks 1–3 | Users understand the Research → Strategy → Paper workflow and can carry context without losing provenance. | New users can complete one supported flow with no coaching; no handoff silently triggers work or execution. |
| **2 · Data and evidence quality** | Weeks 2–8 | Source and market facts become time-bounded, relevant, traceable, and measurable. | Frozen benchmark scored by two independent reviewers plus adjudication; source/data failure paths are clear; no unsupported quality claim. |
| **3 · Strategy validity** | Weeks 4–12 | Replay results model the actual instrument and avoid look-ahead or survivorship shortcuts. | Reproducible walk-forward report across disjoint periods/instruments with realistic costs, baselines, limitations, and exported fingerprints. |
| **4 · Supervised paper reliability** | Weeks 8–16 | Paper decisions are deterministic at the risk boundary and produce reconcilable records. | A preregistered observation period completes with zero unexplained fills, permission violations, or guardrail bypasses. |
| **5 · Professional controls and operations** | Weeks 8–20 | Teams can administer access, investigate failures, recover data, and audit decisions. | Tested tenant isolation, access review, restore drill, incident drill, usable exports, and no unresolved critical security/accessibility issues. |
| **6 · Private beta and proof** | Months 4–6 | A small group of real users validates usefulness, trust, and repeat use. | Measured activation/retention and task outcomes; support incidents closed; claims match observed evidence. |
| **7 · Institutional readiness** | Months 6–12+ | Independent governance, security, legal, reliability, and customer reviews support professional use. | Data rights, legal product scope, independent security assessment, recovery objectives, operating model, and customer controls all documented and passed. |

## Phase 0 — Restore service and establish a safe baseline

**Why first:** the latest deployment is READY, but the project is not serving public routes. At the same time, public materials say “paper only” while gated real order routes exist. Building more features on top of either ambiguity would make the product harder to trust.

### Work

1. **Restore the Vercel project.** The owner should inspect the Vercel account/project state, billing/usage, pause/disable reason, and deployment limits. Re-enable the project through the supported owner controls; do not move production aliases to a preview deployment or bypass platform protections.
2. **Verify after reactivation.** Check `tidelight.app`, `status.tidelight.app`, `api.tidelight.app`, `dev.tidelight.app`, `mcp.tidelight.app`, `package.tidelight.app`, and `blogs.tidelight.app` in a real browser and with route-level health checks. Record the commit and deployment that is actually serving.
3. **Resolve order-execution policy.** For the roadmap’s intended “research, strategy prototype, and trade testing” positioning, default to paper-only. Add a server-enforced kill switch for all live order handlers and prove that no user, including an approved operator, can send a real order while the switch is off. Keep demo/paper ledgers separate from exchange balances and fills.
4. **Reconcile docs and routes.** Update README, onboarding, workspace controls, operator screens, API docs, and tests to describe the actual mode. Do not label the product paper-only if a reachable route can submit a real order.
5. **Capture a clean baseline.** Record current public route status, API/MCP auth boundaries, database migration state, scheduled workers, error rates, provider health, and current feature flags without exposing credentials or customer content.

### Exit criteria

- Public domains load the intended pages and critical API health checks return expected responses.
- Status page and incident history render in a real browser after reactivation.
- Live trading is globally off by default and server-side; tests cover denied requests for users with valid account keys and MFA as well as unauthorized users.
- Production commit, migrations, Vercel target, and status evidence are recorded together.

## Phase 1 — Make the core product coherent

**Outcome:** Tidelight reads as one professional workflow with four clear workspaces, instead of a long menu of capabilities.

### Recommended information architecture

- **Discover:** market map, instrument/issuer details, company events, and watchlists.
- **Research:** question, evidence collection, source review, exposure map, saved decision records, and monitoring.
- **Strategy Lab:** playbook versions, data windows, backtests, validation, and exports.
- **Paper Desk:** Nightwatch and the separate futures paper ledger, each with clear account mode and risk state.
- **Developers:** API/MCP, docs, projects/keys, usage, webhooks, and packages as a separate product lane.

Keep account/security, notifications, help, and status easy to find but secondary to the main workflow. Avoid adding another primary nav destination unless user research shows that an existing workspace cannot contain the task.

### Work

- Define a shared `Decision Record` schema and stable IDs for event, issuer, instrument, source capture, claim, strategy version, replay, paper decision, and user action.
- Make every workflow card state its data mode: live provider observation, cached snapshot, historical replay, paper simulation, or unavailable.
- Create one canonical asset/instrument identity linking issuer, US stock, Bitget Reality rToken, and USDT perpetual without treating them as equivalent.
- Add a “continue this analysis” handoff that preserves the source and timestamp snapshot, but asks the user before a new replay, schedule, or paper action.
- Reduce duplicated status, empty, loading, error, and confirmation patterns. Preserve theme, responsive, keyboard, and screen-reader behavior.
- Conduct observed task sessions with users who did not build the product; watch them find an asset, verify a source, run a replay, and interpret the result.

### Exit criteria

- At least four of five first-time test users can explain what Tidelight does and complete the defined research-to-paper-review flow without assistance (proposed usability gate; increase sample as the user base grows).
- A user can return from a paper result to the exact evidence, instrument, strategy, and cost assumptions that produced it.
- No paper action occurs automatically from opening a research result or clicking a handoff link.

## Phase 2 — Earn trust in evidence and market context

**Outcome:** research becomes a dependable, inspectable product capability rather than an attractive synthesis over uncertain source quality.

### Research evaluation before prompt expansion

1. Finish two independent labels for every displayed claim in the frozen ten-event set, resolve reviewer disagreements, and run the repository scorer. Preserve raw counts and denominators.
2. Expand the benchmark to at least 30–50 dated events across issuer earnings, filings/company events, policy/macro, and market-structure events before using it as a release gate. Freeze the set before changes.
3. Instrument provider selection, request latency, timeouts, schema failures, synthesis fallback reason, source relevance, and retry outcomes. Separate provider uptime from answer quality.
4. Diagnose the 2/10 synthesis result and the source-only/fallback cases. Improve provider reliability and structured response validation before changing prompt behavior.
5. Build a source review panel with exact captured passages, source type, publisher identity, publication time, capture time, URL, access status, issuer/period relevance, and quote match.
6. Cluster duplicates and syndications. Do not count domains as independent publishers without a separately verified independence rule.
7. Show material disagreement, missing primary evidence, counter-evidence, and “what would change this view?” conditions. Separate financial facts, issuer statements, news interpretation, and model-generated analysis.
8. Track revisions and source corrections. A new report should not silently rewrite the evidence record used by an earlier decision.

### Market-data foundations

- Define a canonical market-data contract for provider timestamp, received timestamp, timezone, candle finality, symbol/contract status, source, currency, session, and freshness.
- Detect stale, incomplete, duplicated, out-of-order, revised, and missing candles before research and replay.
- Store an as-of snapshot/hash for every replay and research handoff; document how corporate actions, issuer disclosures, rToken terms, and delisted/expired instruments are represented.
- Preserve distinct models for US-listed shares, tokenized equity products, and perpetual contracts. Display market hours, 24/7 trading differences, liquidity/source differences, issuer-specific redemption/rights information, and missing terms.
- Review the vendor terms for Bitget market-data usage and redistribution; confirm permitted storage, public display, commercial/API use, attribution, and retention. Treat unconfirmed rights as a release blocker for expansion.
- Make Finnhub, Qwen, Gemini, SEC, Bitget, and other provider dependencies visible in the internal data lineage; a provider name is not proof of source quality.

### Proposed quality gates (targets to validate, not current results)

Use the benchmark methodology and agree thresholds with independent reviewers before using them in product claims. A reasonable initial release proposal is:

- 100% of displayed factual claims have an inspectable source record or are explicitly labeled as inference/unsupported.
- At least 98% quote fidelity and at least 95% citation coverage on the reviewed release set.
- No material unsupported claim in a release-critical finding; target under 2% unsupported/not-established claims overall, with every error category published internally.
- At least 80% counter-evidence coverage for events where reviewers found material opposing or qualifying evidence.
- Every source freshness/relevance failure is visible and is excluded from any positive automated handoff.

These numbers are **proposed thresholds**, not observed performance. Small samples do not establish general accuracy. Keep the no-handoff state whenever source count, relevance, freshness, or model validity fails.

## Phase 3 — Make Strategy Lab statistically and instrumentally sound

**Outcome:** users can tell whether a result is a reproducible experiment, an unvalidated idea, or a paper signal—and why.

### Research and replay methods

- Keep the current SMA baseline as a transparent benchmark. Add other rules only with versioned definitions and the same no-lookahead controls.
- Use chronological, rolling walk-forward evaluation across multiple non-overlapping periods. Keep final test periods untouched until the strategy and analysis choices are frozen.
- Use broad periods and market regimes only where the provider has genuine data. State rToken and perpetual inception/history limitations; do not synthesize nonexistent history.
- Compare against cash/flat, buy-and-hold of the same instrument, and a simple fixed exposure benchmark with matching dates and fees.
- Report return, drawdown, volatility, downside risk, turnover, trade count, win/loss distribution, exposure, benchmark-relative result, sensitivity, and uncertainty. Do not promote Sharpe or win rate without sample sizes and calculation details.
- Apply parameter sensitivity and multiple-testing controls. Keep a ledger of strategy variants evaluated so a selected winner is not presented without the selection context.
- Use separate training, validation, and untouched test sets. Include survivorship, delisting, missing-data, and stale-feed handling.
- Fingerprint data, instrument metadata, strategy code/version, parameters, cost model, and run implementation. Export a self-contained replay bundle and verify it produces identical metrics.

### Instrument-specific execution model

For **US stock perpetuals**, model the actual contract multiplier/size, ticks, fees, funding, leverage/margin requirements, mark price, liquidation mechanics, maintenance margin, session and holiday liquidity, spread, slippage, partial fills, rejected orders, and gaps. Reconcile each field to official exchange contract data.

For **rTokens**, model instrument listing/expiry and issuer/product terms, trading hours and liquidity, token/reference-share price divergence, redemption or corporate-action constraints where documented, and unavailable history. Keep product-rights information separate from stock issuer fundamentals.

### Exit criteria

- The same bundle replays to the same result from a fresh environment.
- A reviewer can reproduce headline metrics from exported inputs.
- A strategy is labeled “exploratory” until it passes preregistered out-of-sample tests across several disjoint periods and instruments.
- No marketing statement calls a strategy profitable, institutional, or alpha-producing without an independent review and a sufficiently powered test.

## Phase 4 — Make paper testing operationally credible

**Outcome:** Nightwatch and the futures paper desk produce an auditable record of what a bounded process proposed, what controls allowed or blocked, and what the simulation did.

### Work

- Standardize a paper decision journal: source snapshot, market snapshot, rule/agent version, proposed action, risk checks, approval/rejection, simulated order/fill, fees, slippage, position, and post-event reconciliation.
- Keep Nightwatch and futures ledgers separate, with explicit instrument type, unit/contract semantics, and data source.
- Add portfolio-level constraints: per-instrument and aggregate exposure, concentration, daily/weekly loss, drawdown halt, maximum concurrent positions, cool-down, scheduled windows, stale-data lock, duplicate event suppression, and owner pause.
- Use idempotency keys and atomic transactions for every scheduled decision/fill. Retries must not duplicate a paper action. Every limit and state transition must be visible to the user.
- Add replay and chaos scenarios for stale/corrected candles, exchange outage, price gaps, clock drift/DST, duplicate cron delivery, concurrency, user pause during a lease, malformed strategy output, and data source disagreement.
- Separate model proposal from deterministic risk evaluation and paper fill simulation. If model output is malformed or unavailable, do not turn it into a trade or a fake HOLD.
- Require fresh human review for any new strategy or risk configuration; make changes versioned and effective prospectively.
- Run a preregistered supervised observation period. Proposed minimum: 90 calendar days or a predefined, statistically useful count of eligible decisions spanning normal and stressed conditions, whichever better fits the data. Do not backdate observations or hide blocked decisions.

### Exit criteria

- Zero unexplained fills, duplicate actions, cross-account records, or guardrail bypasses over the observation window.
- Every paper action reconciles to the immutable request, rule version, market snapshot, and configured cost model.
- Published reports clearly state that paper results are simulated and cannot predict exchange outcomes.

## Phase 5 — Professional security, governance, and operations

**Outcome:** organizations can manage access and recover from failures; Tidelight's claims and controls withstand scrutiny from a cautious buyer.

### Security and tenancy

- Perform a current data-flow and threat model covering auth, RLS, service-role routes, org membership, API/OAuth keys, webhooks, worker secrets, operator/admin pages, and any private exchange credential path.
- Reconcile Supabase grants, RLS policies, views, RPC execution rights, and service-only tables against each route. Do not add broad policies or suppress advisors without a verified access case.
- Test tenant isolation with hostile IDs and cross-organization projects, research jobs, saved briefs, replay links, paper ledgers, support tickets, and API usage.
- Add organization lifecycle and least-privilege role design: owner, administrator, researcher, read-only reviewer, and service identity. Decide who can publish/revoke evidence, approve shared strategy versions, edit limits, export, and administer integrations.
- Define audit retention, export, tamper resistance, deletion, and legal hold policy. Include administrator changes, data exports, auth events, strategy revisions, risk checks, and notification changes.
- Complete strong account recovery, MFA/passkeys, session management, service-account rotation, email-domain abuse handling, and verified email delivery. Check that privileged status is server-authorized, not based only on a client-supplied email or role flag.
- Add dependency scanning, secret scanning, vulnerability intake, patch SLAs, and incident disclosure procedures. Commission an independent penetration test after controls stabilize.
- Consider SSO/SAML and SCIM only after real organization customers require them; design the authorization model first.

### Reliability and operations

- Define SLOs for the app, market reads, research-job acceptance/completion, worker dispatch, email delivery, webhooks, and status/history separately. Report provider availability separately from Tidelight availability.
- Use request/run correlation IDs across browser, API, queue, worker, provider, database transaction, webhook, and paper ledger. Redact tokens, source-sensitive content, account balances, and personal data from logs.
- Maintain provider-specific health, latency, quota, retry, and circuit-breaker telemetry. Show degraded dependencies honestly; never allow cached data to look live.
- Document and test migration rollback/forward-fix procedures. Use expand/contract schema changes and verify production migration state before backfills.
- Set explicit recovery objectives with the owner. Proposed initial targets for review: RPO ≤15 minutes and RTO ≤4 hours for core private research and paper records, subject to actual Supabase/Vercel plan capabilities.
- Run an isolated backup restore rehearsal, record the restore time and point, validate tenant isolation and totals, and repeat after major storage changes. Never overwrite production as a test.
- Run an incident exercise that covers deployment disablement, compromised provider credentials, stale market feeds, queue backlog, accidental duplicate paper actions, and a database restore.
- Retain the public status page as an independently reachable communication surface and test it during an app outage, not only when the app is healthy.

### Legal, data, and governance review

- Obtain legal review of the distinction between informational research, investment advice/recommendations, paper simulation, and execution in the intended US and Nigerian operating context.
- Obtain written provider rights for quotes, candles, derived data, redistribution, caching, backtest archives, public APIs, and package/client use. Maintain a provider/source inventory with renewal and usage limits.
- Review issuer, rToken, and perpetual contracts/terms; explain that a tokenized representation can have different rights, settlement, liquidity, and counterparty risks from the underlying share.
- Publish privacy, data-retention, deletion, AI-provider processing, and incident-disclosure practices. Identify what is sent to each model and how long it is retained.
- Establish an evidence change-control process: benchmark changes, prompt changes, strategy version changes, market data corrections, and model/provider upgrades require versioned notes and reruns of relevant evaluation.
- Pursue SOC 2 or ISO certification only after a customer need, control owner, and budget are clear. Do not describe roadmap work as certification or compliance.

## Phase 6 — Private beta and customer proof

**Outcome:** real users confirm that Tidelight makes their work faster or more reliable without changing the evidence boundary.

### Beta scope

- Invite a small set of users who follow US equities and rTokens; keep the first cohort read-only/research plus paper testing.
- Provide a guided first task using live sources and clear provider state. Avoid pre-filled “successful” simulated results that look like current production evidence.
- Measure time to first saved, source-reviewed decision record; completion rate; evidence panels opened; replay exports; paper controls used; weekly return; and support issues.
- Interview users about instrument understanding, source trust, strategy interpretation, risk controls, and what they would need before relying on the product.
- Publish a public limitations page explaining data coverage, model evaluation status, strategy assumptions, paper-versus-live differences, and current supported instruments.

### Exit criteria

- A meaningful share of beta users return for a second independent task and can distinguish source evidence from model analysis.
- No unresolved critical privacy, access, correctness, or recovery defects.
- Product claims are tied to recorded metrics and bounded by the test population.

## Phase 7 — Institutional readiness and scale

Only begin this phase after the prior proof gates hold.

- Add enterprise deployment and data controls only when customer demand and the operating model are clear: SSO/SCIM, organization-level policy, retention controls, audit export, admin analytics, and contractual support.
- Define support hours, incident severity and response targets, change notice, maintenance notice, deprecation policy, API version policy, and customer communication process.
- Complete independent security review and remediate critical/high findings with verified closure evidence.
- Establish audited financial-data/model governance: approved source registry, methodology review, change approvals, reproducibility records, and documented limitations.
- Decide whether to remain a research/paper platform or propose any real order capability. A live product requires a separate business case, legal/regulatory analysis, data rights, operational support plan, permission architecture, restricted per-user credentials, user-specific authorization, transaction confirmation, global kill switch, reconciliation, fraud monitoring, and independent end-to-end testing. Passing a sandbox test is not a production approval.
- Scale the application or extract services only when observability and ownership show a concrete operational bottleneck. Keep a modular monolith until independent scaling, tenancy, incident isolation, or deployment ownership justifies extraction.

## Near-term execution plan

### First 7 days

1. Restore the Vercel project and confirm the reason for `live: false`; re-open all public routes from a clean browser.
2. Put server-side live order execution behind a verified global off switch and reconcile all user-facing copy with the actual capability.
3. Record the production migration, feature-flag, scheduler, provider, and status baseline.
4. Reconcile `CODEX_HANDOFF.md`, `TIC_IMPLEMENTATION.md`, and this roadmap where current evidence differs from old notes.

### Weeks 2–3

1. Run the two-reviewer frozen research evaluation and publish its incomplete/complete gate accurately.
2. Instrument model/provider success and failure causes; diagnose low synthesis availability separately from answer quality.
3. Agree the canonical instrument schema and data freshness rules for issuer shares, rTokens, and perpetuals.
4. Observe first-time users through one workflow and simplify navigation around the core workspaces.

### Weeks 4–8

1. Expand and freeze the research benchmark; improve source relevance, quote validation, deduplication, and counter-evidence based on measured failures.
2. Produce a Strategy Lab methods report: data coverage, splits, assumptions, execution costs, baseline results, and limitations.
3. Add full instrument-aware cost and fill models where official data supports them; otherwise keep the instrument marked unsupported for decision-grade replay.
4. Prepare chaos and tenant-isolation cases for Nightwatch and futures paper ledgers.

### Weeks 8–16

1. Start the supervised paper observation only after its protocol, strategy, limits, and review owner are recorded.
2. Complete isolated restore and incident exercises; fix reliability findings before beta.
3. Close current data-rights, security, and operating-policy blockers for the chosen beta scope.
4. Run private beta with research and paper-only controls; collect outcome evidence.

## North-star metrics and scorecard

The initial scorecard should measure trust and task completion, not trading returns alone.

| Dimension | Metric | Proposed interpretation |
|---|---|---|
| **User value** | Weekly source-reviewed decision records; 30-day repeat use; median time to first saved reviewed record | Shows whether Tidelight helps users finish a meaningful task and return. Segment by user type and workflow. |
| **Research quality** | Citation coverage, quote fidelity, unsupported-claim rate, source relevance, counter-evidence coverage, freshness | Publish raw counts/denominators from the frozen, adjudicated benchmark; separate provider errors from model errors. |
| **Instrument integrity** | Percent of supported assets with complete canonical identity, session, source timestamp, and terms metadata | Unknown/incomplete instrument metadata must block higher-confidence strategy handoffs. |
| **Quant validity** | Reproducibility rate, number of disjoint holdouts, benchmark-relative result distribution, sensitivity, realistic cost coverage | Do not optimize to headline return. Include every evaluated strategy variant and negative periods. |
| **Paper safety** | Duplicate action rate, stale-data block rate, unexplained-fill count, guardrail breach count, manual pause response | Target zero unexplained fills and zero guardrail bypasses; review every anomaly. |
| **Reliability** | SLO attainment by service, queue age, completion latency, provider error budget, recovery drill RTO/RPO | Report Tidelight-controlled and provider-controlled components separately. |
| **Security** | Critical/high open findings, access review completion, cross-tenant denial tests, credential/audit coverage | No critical open findings at beta; no raw secrets in browser or logs. |
| **Operations** | Time to acknowledge/mitigate incidents, successful restore drills, status communication latency | A status page must stay usable when product routes are degraded. |

All thresholds in this table are targets to agree and measure; none are current achievements unless supported by dated evidence.

## Deliberately defer

- Automated live execution, leveraged agentic trading, copy trading, or model-controlled user accounts.
- “AI alpha,” win-rate, profit, or institutional-readiness claims.
- Broad public data redistribution before written provider rights are confirmed.
- More top-level features, social growth loops, or cosmetic dashboards before the core workflow passes usability and evidence gates.
- SSO/SCIM, SOC 2/ISO certification, and service decomposition without customer demand and an accountable operating owner.
- Inferred uptime, fabricated backfill, or model-generated historical results presented as observed facts.

## Decisions the product owner should make before Phase 1 expands

1. Confirm the public product is a research and paper-testing product, with live trading disabled globally. The code currently has guarded live-order routes; reconcile this before broader rollout.
2. Confirm primary launch user: active self-directed rToken researcher, strategy tester, or developer/platform integrator. The initial navigation and beta should optimize one primary user, not all segments equally.
3. Confirm which rToken issuers/instruments are in scope and what provider agreements allow for public display, retention, and redistribution.
4. Approve the proposed initial research-quality thresholds and the sample size/reviewer process.
5. Agree recovery targets, beta support expectations, and the budget/owner for independent security and legal reviews.

## Source of truth and related records

- [`docs/TIC_IMPLEMENTATION.md`](TIC_IMPLEMENTATION.md) — TIC architecture, production routes, migration and deployment evidence; some entries are historical and must be reconciled with current platform state.
- [`docs/CODEX_HANDOFF.md`](CODEX_HANDOFF.md) — latest session-specific continuation notes; its production baseline may lag current `main`.
- [`docs/RESEARCH_EVALUATION_PROTOCOL.md`](RESEARCH_EVALUATION_PROTOCOL.md) — frozen research benchmark and reviewer methodology.
- [`docs/benchmarks/research-benchmark-capture-log-2026-10-24.md`](benchmarks/research-benchmark-capture-log-2026-10-24.md) — ten observed production captures; explicitly not scored.
- [`docs/STRATEGY_VALIDATION_2026-10-05.md`](STRATEGY_VALIDATION_2026-10-05.md) — dated negative baseline diagnostic and candle fingerprints.
- [`docs/AI_TRADING_BUILD_2026-10-08.md`](AI_TRADING_BUILD_2026-10-08.md) — market-specific strategy, paper, and live-order boundaries.
- [`docs/EVIDENCE_AND_RUNTIME_RELIABILITY.md`](EVIDENCE_AND_RUNTIME_RELIABILITY.md) — production evidence, operational findings, and reliability workflow.
- [`docs/OPERATIONS_RUNBOOK.md`](OPERATIONS_RUNBOOK.md) — deployment, status, worker, incident, and recovery procedures.

Update this roadmap only when repository code, production state, evaluation records, or independently reviewed policy changes. A completed implementation is not a completed product gate until its evidence is recorded.
