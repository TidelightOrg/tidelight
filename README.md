<div align="center">
  <img src="./public/tidelight-mark.svg" alt="Tidelight" width="64" height="64" />
  <h1>Tidelight</h1>
  <p><strong>See the signal between sessions.</strong></p>
  <p>Follow a market story from the event, to its evidence, to the assets it may touch.</p>
  <p>
    <a href="https://tidelight.app"><strong>Explore Tidelight ↗</strong></a>
    &nbsp; · &nbsp;
    <a href="https://tidelight.app/markets">Browse markets</a>
    &nbsp; · &nbsp;
    <a href="https://tidelight.app/research">Start a research brief</a>
    &nbsp; · &nbsp;
    <a href="./README.zh-CN.md">简体中文</a>
  </p>
</div>

<br />

<p align="center">
  <img src="./docs/readme-assets/tidelight-macbook.png" alt="Tidelight research connects company events to evidence and potential market exposure." width="100%" />
</p>

<p align="center"><sub>A calmer research desk for the hours between headlines.</sub></p>

---


## Live Judge evidence

- [Research benchmark capture score](https://tidelight.app/judge#research-benchmark): all ten frozen production runs captured (10/10); AI synthesis returned in two (2/10). This is a capture score, not a claim-quality score. The protocol score awaits independent claim labels and adjudication.
- [Package install verification](https://tidelight.app/judge#package-install-evidence) records the monorepo checks and fresh registry installs of the SDK, MCP, React, CLI, and Python 0.1.2 packages. A separate [npm and Python install-and-usage recording](https://tidelight.app/judge-evidence/tidelight-npm-python-install-usage-20261024.html) shows the consumer commands and package entry-point checks.
- [Fresh browser install walkthrough](https://tidelight.app/judge#package-install-evidence) shows a 3:58 Chromium capture of all 12 npm and Python package checks; the [playable MP4](https://raw.githubusercontent.com/TidelightOrg/tidelight/main/public/judge-evidence/npm-python-install-walkthrough-fresh-20261024.mp4) and [machine-readable results](https://tidelight.app/evidence/npm-python-install-walkthrough-fresh-20261024.json) are published here. Python 3.12.14 passed; Python 3.9 is below the package's declared minimum.

- [Judge Mode](https://tidelight.app/judge) includes a signed-out browser route-test record for seven public routes returning HTTP 200; the linked MP4 failed the production integrity/playback check and is not counted as delivered video evidence. The [capture details](https://tidelight.app/evidence/tidelight-live-route-test-20261024.json) state the coverage boundary.
- [Codex Tidelight MCP evidence](https://tidelight.app/judge#codex-mcp-evidence) links the current connected plugin registry and a separate [authenticated NVDA market-read record](https://tidelight.app/evidence/tidelight-codex-mcp-market-check-20261024.json) with two read-only calls, timestamps, and request IDs. These are market lookups, not company research jobs. The current grant does not expose a research-job tool.
- [Authenticated npm/Python/MCP job attempt](https://tidelight.app/evidence/tidelight-research-job-client-attempt-20261024.json) records the Codex Cloud credential check and live tool list. No SDK install or research job ran because the environment had no preconfigured `research:run` key; the current MCP registry is market-only.
- [Ecosystem status](https://status.tidelight.app) checks the public product, developer docs, package directory, REST API, protected research-job endpoint, MCP metadata, npm/PyPI registries, and database. Background job execution, delivery history, incidents, and scheduled uptime are not independently monitored yet.

### Authenticated research · 25 October 2026

[Judge result cards](https://tidelight.app/judge#authenticated-research) distinguish each live path. Exact safe request/job IDs are retained; credentials and report bodies are excluded. `.cast` files are timed actual sanitized stdout, not browser video.

| Path | Observed outcome and boundary | Direct artifacts |
| --- | --- | --- |
| Published npm + PyPI cross-client | npm SDK starts one AAPL job; PyPI SDK polls the same ID to complete. | [published-start.json](public/evidence/authenticated-research-20261025/published-start.json) · [published-poll.json](public/evidence/authenticated-research-20261025/published-poll.json) · [published-poll.cast](public/evidence/authenticated-research-20261025/published-poll.cast) · [published-sdk-install.json](public/evidence/authenticated-research-20261025/published-sdk-install.json) |
| Direct authenticated HTTP MCP | MSFT research completed over direct Streamable HTTP, independently of the Codex connector. | [mcp.json](public/evidence/authenticated-research-20261025/mcp.json) · [mcp.cast](public/evidence/authenticated-research-20261025/mcp.cast) |
| Published npm stdio MCP discovery | Installed @tidelight/mcp@0.1.2 initializes and lists research tools; no extra job started. Codex connector remains market-only. | [stdio.json](public/evidence/authenticated-research-20261025/stdio.json) · [stdio.cast](public/evidence/authenticated-research-20261025/stdio.cast) · [install.json](public/evidence/authenticated-research-20261025/install.json) · [installed-bridge.json](public/evidence/authenticated-research-20261025/installed-bridge.json) |
| Source-checkout SDK runs | Source-checkout NVDA/AAPL starts hit polling 429; later Python reads confirmed complete. TypeScript has JSON only. | [python.json](public/evidence/authenticated-research-20261025/python.json) · [python.cast](public/evidence/authenticated-research-20261025/python.cast) · [javascript-attempt.json](public/evidence/authenticated-research-20261025/javascript-attempt.json) · [followup.json](public/evidence/authenticated-research-20261025/followup.json) |

[Evidence scope and recorder sources](public/evidence/authenticated-research-20261025/README.md) · [Artifact checksums](public/evidence/authenticated-research-20261025/sha256.json) · [Download evidence ZIP](public/evidence/authenticated-research-20261025.zip). The timed Python source-checkout recording ends at the quota error; completion reads are separate. The published SDK cross-client job has its own package-originated start and polling records.

## Make sense of the story behind the price

A company update, a policy decision, or a shift in another sector can move a market while the usual headlines are quiet. Tidelight gives you one place to ask what changed, inspect the source, and follow the possible connections.

**The Tidelight method:** Event → Evidence → Exposure → Scenario → Your decision.

Ask in everyday language. Bring a source. See what supports the story, what pushes back, and which tokenized equities may be affected. The goal is a clearer view you can question—not a signal that tells you what to buy or sell.

## Start with what matters to you

| You want to… | Start here |
| --- | --- |
| See tokenized US equities and public market prices | [Market map](https://tidelight.app/markets) |
| Ask a company or market question and review the sources | [Research desk](https://tidelight.app/research) |
| Follow the companies you care about | [Watchlist](https://tidelight.app/watchlist) |
| Compare an idea against historical market data | [Strategy Lab](https://tidelight.app/strategies) |
| Explore a bounded, paper-only market watcher | [Nightwatch](https://tidelight.app/nightwatch) |
| Rehearse a stock-perpetual idea without exchange orders | [Futures paper desk](https://tidelight.app/futures) |

You can explore public market pages without an account. Sign in to keep private briefs, watchlists, saved research, and paper ledgers with your account.

## One connected way to do your research

### Follow the evidence

Tidelight links claims to the source material used in a brief. Open the source, check its date, and compare evidence that may challenge the first read. Mini offers a concise explanation; Pro shows more of the claims, context, confidence, and scenarios behind it.

### Understand possible exposure

Connect an event to issuers, sectors, and tokenized instruments. Market hours, liquidity, and issuer terms can differ across assets, so Tidelight keeps those details in view when available.

### Rehearse decisions with clear limits

Strategy Lab replays a baseline against historical public candles. Nightwatch and the Futures Paper Desk record simulated decisions, assumptions, and risk limits in separate paper accounts. These tools help you study a process; past or simulated outcomes do not predict what comes next.

## Built to keep the boundaries clear

- **Prices have context.** Public Bitget quotes are shown with available freshness and market information. A feed can be delayed, unavailable, or different from another venue.
- **Sources remain inspectable.** A research brief is an aid to review. It does not independently verify every statement in an outside article.
- **Private work stays private.** Signed-in briefs, preferences, watchlists, and ledgers are protected by account-scoped database policies.
- **Paper means paper.** Nightwatch and the Futures Paper Desk simulate activity. They do not place exchange orders, hold assets, or manage customer funds.
- **You stay in control.** Tidelight is an informational research product, not financial advice or a recommendation. Check original sources and your own circumstances before acting.

## Project at a glance

| | |
| --- | --- |
| **What it is** | An evidence-first market research desk for tokenized US equities |
| **Who it is for** | Curious investors, researchers, and market watchers |
| **Live product** | [tidelight.app](https://tidelight.app) |
| **Repository** | [TidelightOrg/tidelight](https://github.com/TidelightOrg/tidelight) |
| **Market data** | Public Bitget market feeds; SEC issuer filings; optional Finnhub analyst-target aggregates |
| **AI research** | Server-side Bitget Qwen and Gemini integrations |
| **Privacy** | Supabase Auth and owner-scoped PostgreSQL policies |
| **Built with** | Next.js, TypeScript, and Supabase |
| **Live trading** | Disabled. Paper activity is simulated. |

Prices, coverage, and provider availability may change. Finnhub is an optional source for aggregate analyst targets; its free plan can have usage limits. If the data is unavailable, Tidelight should say so rather than invent a target.

## Judge review · public evidence

Start with [**Judge Mode**](https://tidelight.app/judge) for a concise product review. Each public record states its scope and limitations.

<details>
<summary><strong>Open live public research replays</strong></summary>

Research links are public for 30 days from publication and can be revoked. Each replay contains selected research fields, source links, market snapshots, and risk gates; it is not an audited performance or trade record.

| Token | Review scope | What the live run reports |
| --- | --- | --- |
| [rTSLA replay](https://tidelight.app/replay/c5f5b22e-c995-4a5e-8193-5737c4d413b8) · [JSON](https://tidelight.app/api/research/replays/c5f5b22e-c995-4a5e-8193-5737c4d413b8?format=json) | Tesla catalysts and rTSLA tradability | 40 issuer headlines across 30 publishers; rTSLA quote marked stale; AI synthesis unavailable; due diligence only. |
| [rMSFT replay](https://tidelight.app/replay/4e86bf9c-7295-4be1-ae52-487341e7f1ca) · [JSON](https://tidelight.app/api/research/replays/4e86bf9c-7295-4be1-ae52-487341e7f1ca?format=json) | AI infrastructure investment, Azure demand, competition, and capital intensity | 40 headlines across 23 publishers; token quote fresh at capture; liquidity, spread, and premium/discount unmeasured; AI synthesis unavailable. |
| [rAAPL replay](https://tidelight.app/replay/5d27e66c-2a87-4450-95d3-5014e1309216) · [JSON](https://tidelight.app/api/research/replays/5d27e66c-2a87-4450-95d3-5014e1309216?format=json) | Services, device cycle, and regulatory risk | 40 headlines across 22 publishers; token quote marked stale; AI synthesis unavailable. |
| [rGOOGL replay](https://tidelight.app/replay/7ca56a20-c064-4f99-b351-806b2ddd685e) · [JSON](https://tidelight.app/api/research/replays/7ca56a20-c064-4f99-b351-806b2ddd685e?format=json) | Search advertising, antitrust remedies, and AI-search competition | 40 headlines across 17 publishers; token quote fresh at capture; AI synthesis unavailable. |
| [rAMZN replay](https://tidelight.app/replay/c67d7b29-85eb-4c27-8a29-2cbe85bd4e91) · [JSON](https://tidelight.app/api/research/replays/c67d7b29-85eb-4c27-8a29-2cbe85bd4e91?format=json) | AWS investment, retail economics, logistics, and AI infrastructure | 40 headlines across 21 publishers; token quote fresh at capture; AI synthesis unavailable. |
| [rNVDA replay](https://tidelight.app/replay/c2ffbe89-74a5-4547-bf89-5952e37efeaa) · [JSON](https://tidelight.app/api/research/replays/c2ffbe89-74a5-4547-bf89-5952e37efeaa?format=json) | Earlier tokenized-market review | Earlier published run; inspect its captured limitations and gate. |
| [NVDA + TSLA replay](https://tidelight.app/replay/91bb478a-7977-4b34-b32d-b1f558a8af75) · [JSON](https://tidelight.app/api/research/replays/91bb478a-7977-4b34-b32d-b1f558a8af75?format=json) | Compare issuer evidence and risks | Earlier published comparison with separate source sets and decision gates. |
| [NVDA replay](https://tidelight.app/replay/13bcee6c-3d69-4bd0-bb2c-e3591c73529b) · [JSON](https://tidelight.app/api/research/replays/13bcee6c-3d69-4bd0-bb2c-e3591c73529b?format=json) | Current public-source review | 40 headlines across 27 publishers; Gemini synthesis reported a mixed reading at 40% model confidence; HOLD and no trade handoff. |
| [NVDA live research replay](https://tidelight.app/replay/ed08a907-14b0-41dd-b731-78870fe3255b) · [JSON](https://tidelight.app/api/research/replays/ed08a907-14b0-41dd-b731-78870fe3255b?format=json) | Latest public catalysts and key uncertainties, separated from tokenized market context | 20 sources; 8 captured workflow steps; 40% model-reported confidence; stale quote; no directional scenario or trade handoff. |

**Evidence boundary:** The five initial issuer runs collected headlines but returned no AI synthesis. A later NVDA run returned Gemini synthesis (mixed, 40% model-reported confidence) with source-linked supporting points, no source-linked challenges, a stale quote gate, and no trade handoff. These are research workflow records, not finished analyst theses or audited performance. Quote snapshots are historical to each run.

</details>

<details>
<summary><strong>Open Nightwatch position captures · 22 Oct 2026</strong></summary>

The public exhibit presents three historical Nightwatch paper positions. The source reports 23 decisions, five paper orders, and three open positions; only the pictured positions are included. Raw order rows, account identifiers, balances, and internal record IDs are excluded.

![Nightwatch rNVD paper position capture](https://tidelight.app/judge-evidence/nightwatch-rnvd-position.png)

![Nightwatch rAAPL paper position capture](https://tidelight.app/judge-evidence/nightwatch-raapl-position.png)

![Nightwatch rGOOGL paper position capture](https://tidelight.app/judge-evidence/nightwatch-rgoogl-position.png)

See the [sanitized position summary JSON](https://tidelight.app/evidence/nightwatch-position-captures.json) or [view the image set in Judge Mode](https://tidelight.app/judge#nightwatch-position-captures). These are simulated marks captured on different dates, not exchange transactions, audited returns, current prices, or a live query of the current account ledger.

</details>

<details>
<summary><strong>Nightwatch email delivery evidence · 24 Oct 2026</strong></summary>

The matching Gmail message arrived at 09:00 WAT from Tidelight Nightwatch. Gmail reported SPF, DKIM, and DMARC passing. It records a rejected HOLD for RNVDUSDT because an existing long position was active. This verifies notification delivery and rendering; it does not independently prove ledger state, an exchange order, or trading performance. The public record excludes the recipient address and Gmail message ID.

<a href="https://tidelight.app/judge#nightwatch-email-delivery"><img src="https://tidelight.app/judge-evidence/nightwatch-rnvdusdt-email.jpeg" width="240" alt="Gmail screenshot of a Tidelight Nightwatch analysis email for RNVDUSDT" /></a>

Open the [delivery metadata](https://tidelight.app/evidence/nightwatch-email-delivery.json), [full Gmail screenshot](https://tidelight.app/judge-evidence/nightwatch-rnvdusdt-email.jpeg), or [Judge Mode evidence card](https://tidelight.app/judge#nightwatch-email-delivery).

</details>

<details>
<summary><strong>RAAPLUSDT Nightwatch signal and paper fill emails · 24 Oct 2026</strong></summary>

These Gmail captures show the Nightwatch BUY signal notification and the subsequent paper-fill notification for RAAPLUSDT. They demonstrate email delivery and message rendering; the messages are not exchange receipts or audited performance records.

<a href="https://tidelight.app/judge#nightwatch-notification-evidence"><img src="https://tidelight.app/judge-evidence/nightwatch-raaplusdt-buy-alert.jpg" width="220" alt="Gmail screenshot of the RAAPLUSDT Nightwatch BUY signal email" /></a>
<a href="https://tidelight.app/judge#nightwatch-notification-evidence"><img src="https://tidelight.app/judge-evidence/nightwatch-raaplusdt-paper-fill.jpg" width="220" alt="Gmail screenshot of the RAAPLUSDT Nightwatch paper fill email" /></a>

Open the [notification evidence record](https://tidelight.app/evidence/nightwatch-email-notifications.json) or [Judge Mode gallery](https://tidelight.app/judge#nightwatch-notification-evidence).

</details>

## Research data and trading artifacts

<details>
<summary><strong>Open public Strategy Lab replay · Apple · 4H</strong></summary>

The [published strategy replay](https://tidelight.app/strategy-replay/58348395-ff65-4a4c-be5a-019234379587) includes 525 archived candles, the rule, date window, costs, holdout trades, and a SHA-256 fingerprint. The 32-day out-of-sample return was **−0.76% after estimated costs**, versus **+2.12% buy and hold**; maximum drawdown was **−4.04%** across three trades. The [replay JSON](https://tidelight.app/api/strategy-replays/58348395-ff65-4a4c-be5a-019234379587) is the machine-readable archive.

This is a historical simulation, not a forecast or audited performance. Costs are estimates, Reality token prices may differ from issuer shares, and no live orders were placed. The share expires 23 November 2026 and can be revoked by its owner.

</details>

<details>
<summary><strong>Open the public JSON index and data boundaries</strong></summary>

- [Public evidence manifest JSON](https://tidelight.app/evidence/manifest.json) — route inventory, reproducibility requirements, and evidence limitations.
- Each replay row links to its downloadable, sanitized JSON record. The export is the same selected public payload shown on the replay page, not the private full account run.
- The [public Apple 4H strategy replay](https://tidelight.app/strategy-replay/58348395-ff65-4a4c-be5a-019234379587) and [archived JSON](https://tidelight.app/api/strategy-replays/58348395-ff65-4a4c-be5a-019234379587) document a negative holdout result; no positive alpha result or public account ledger is claimed.
- Nightwatch fills remain private until the owner publishes an individual sanitized replay. [Open the public Nightwatch replay directory](https://tidelight.app/nightwatch/replays); each trade replay omits identity, balances, and unrelated ledger rows.
- The [Nightwatch position summary JSON](https://tidelight.app/evidence/nightwatch-position-captures.json) describes the historical captures only; the full account export is not public.
- The public research runs contain no live orders, exchange fills, or audited trading returns. Do not interpret a source-count or quote snapshot as strategy performance.

</details>

## Judge links · Tidelight ecosystem

<details>
<summary><strong>Open the Tidelight judge directory</strong></summary>

Use this directory to move directly between the public product, its judge walkthrough, and the developer ecosystem. The live research demo is designed to be explored without signing in; account-only features may ask you to create an account.

### Suggested judging path

| Visit | What to inspect |
| --- | --- |
| [Public judge mode](https://tidelight.app/judge) | Start here for the public evaluation overview and judge-facing evidence. |
| [Research flow demo](https://tidelight.app/flow?demo=1) | Follow a sample question through research steps, sources, exposure, and decision gates. |
| [Judge mode guide](https://github.com/TidelightOrg/tidelight/blob/main/docs/S2_JUDGE_MODE.md) | Read the intended evaluation sequence, what each surface demonstrates, and evidence boundaries. |

### Product surfaces

| Visit | What it does |
| --- | --- |
| [Tidelight home](https://tidelight.app/) | Product overview and entry point to the workspace. |
| [Market map](https://tidelight.app/markets) | Browse covered tokenized equities and market context. |
| [Research desk](https://tidelight.app/research) | Create a source-led market brief and inspect its evidence. |
| [Watchlist](https://tidelight.app/watchlist) | Track selected companies and instruments. |
| [Strategy Lab](https://tidelight.app/strategies) | Review historical strategy replays and their assumptions. |
| [Nightwatch](https://tidelight.app/nightwatch) | Inspect bounded monitoring and paper-run workflows. |
| [Nightwatch paper replays](https://tidelight.app/nightwatch/replays) | Review sanitized paper-trade replays and their source decisions. |
| [Futures paper desk](https://tidelight.app/futures) | Rehearse stock-perpetual ideas in a simulated paper environment. No exchange orders are placed. |
| [Research community](https://tidelight.app/community) | Explore the community research surface. |
| [Saved briefs](https://tidelight.app/briefs) | Review saved research briefs when signed in. |
| [Exchange workspace](https://tidelight.app/trading) | Inspect the Bitget workspace and its exchange controls; live trading is disabled. |

### Developer platform

[Context.dev browser-visible developer experience study](docs/CONTEXT_DEV_REVERSE_ENGINEERING.md) records workspace, usage, credential, batch/monitor and status observations, with Tidelight comparisons and explicit limits on private backend claims.

[Authenticated research evidence](public/evidence/authenticated-research-20261025/README.md) separates direct HTTP MCP, published npm stdio discovery, installed SDK use and the Codex connector registry.

| Visit | What it does |
| --- | --- |
| [Developer portal](https://tidelight.app/developers) | Overview of the API, SDKs, and integration options. |
| [Developer documentation](https://dev.tidelight.app) | API reference, quickstarts, SDK guides, webhooks, and MCP setup. |
| [Developer console](https://tidelight.app/developers/console) | Manage developer projects and credentials. |
| [Package platform](https://package.tidelight.app) | Browse Tidelight SDKs and integration packages. |
| [Package dashboard](https://package.tidelight.app/dashboard) | View package and integration workspace options. |
| [REST API base](https://api.tidelight.app/v1) | Public API base URL; use the developer docs for endpoint details and authentication. |
| [Remote MCP endpoint](https://mcp.tidelight.app/mcp) | Streamable HTTP endpoint for MCP clients; see the developer docs for connection instructions. |
| [Ecosystem status](https://status.tidelight.app) | Live availability checks across Tidelight product, developer, API, MCP, and package services. |

### SDKs, registries, and container

| Package | Product guide | Public registry |
| --- | --- | --- |
| JavaScript SDK | [SDK overview](https://package.tidelight.app/sdk) | [npm: @tidelight/sdk](https://www.npmjs.com/package/@tidelight/sdk) |
| MCP server | [MCP overview](https://package.tidelight.app/mcp) | [npm: @tidelight/mcp](https://www.npmjs.com/package/@tidelight/mcp) · [GitHub Container Registry](https://github.com/orgs/TidelightOrg/packages/container/package/tidelight-mcp) |
| Python SDK | [Python overview](https://package.tidelight.app/python) | [PyPI: tidelight](https://pypi.org/project/tidelight/) |
| React SDK | [React overview](https://package.tidelight.app/react) | [npm: @tidelight/react](https://www.npmjs.com/package/@tidelight/react) |
| CLI | [CLI overview](https://package.tidelight.app/cli) | [npm: @tidelight/cli](https://www.npmjs.com/package/@tidelight/cli) |

### Source code and project information

| Visit | What it contains |
| --- | --- |
| [Main application repository](https://github.com/TidelightOrg/tidelight) | Product source, implementation notes, and project history. |
| [API repository](https://github.com/TidelightOrg/tidelight-api) | API service source and its implementation. |
| [MCP repository](https://github.com/TidelightOrg/tidelight-mcp) | MCP server source. |
| [JavaScript SDK repository](https://github.com/TidelightOrg/tidelight-sdk) | TypeScript/JavaScript client source. |
| [Python SDK repository](https://github.com/TidelightOrg/tidelight-python) | Python client source. |
| [Examples repository](https://github.com/TidelightOrg/tidelight-examples) | Integration examples for developers. |
| [Tidelight GitHub organization](https://github.com/TidelightOrg) | All public repositories and organization activity. |
| [Product plan](https://github.com/TidelightOrg/tidelight/blob/main/docs/planning/PROJECT_PLAN.md) | Product direction and planned work. |
| [Current milestones](https://github.com/TidelightOrg/tidelight/blob/main/docs/NEXT_BUILD_MILESTONES.md) | Current implementation milestones. |

### Help and policies

| Visit | What it contains |
| --- | --- |
| [Help center](https://tidelight.app/help) | Product help and support options. |
| [Contact Tidelight](https://tidelight.app/contact) | Contact and feedback routes. |
| [Terms](https://tidelight.app/terms) | Product terms. |
| [Privacy](https://tidelight.app/privacy) | Privacy information. |
| [Security contact](mailto:security@tidelight.app) | Responsible security and technical reports. |

</details>



## For people who want to build with us

The product is easiest to understand by exploring the live app first. If you want to run a local copy, improve a flow, or inspect the implementation, the notes below are for you.

<details>
<summary><strong>Run Tidelight locally</strong></summary>

You will need Node.js, npm, and access to a Supabase project.

```bash
npm ci
cp .env.example .env.local
```

Add the Supabase URL and publishable key to `.env.local`. Server-side AI features can use the provider keys documented in [`.env.example`](./.env.example). Keep secret keys on the server; never add them to a `NEXT_PUBLIC_` variable or commit them to Git.

Then start the app:

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000). Useful checks are `npm run typecheck`, `npm run lint`, and `npm run build`. Database changes are in [`supabase/migrations`](./supabase/migrations); the policies keep signed-in records scoped to their owner.

Quarterly and annual issuer facts come from SEC EDGAR. Finnhub analyst-target aggregates require the server-only `FINNHUB_API_KEY`; provider quotas and coverage apply. Passkey sign-in remains hidden until the production Supabase Auth provider and relying-party domain are configured.

</details>

## The work ahead

Tidelight is being built with a simple standard: show the evidence, label assumptions, preserve uncertainty, and keep simulations visibly separate from real trading. Follow the [product plan](./docs/planning/PROJECT_PLAN.md) and [current milestones](./docs/NEXT_BUILD_MILESTONES.md), or [open an issue](https://github.com/TidelightOrg/tidelight/issues) with a confusing moment, a missing source, or an idea that would make the desk more useful.

<div align="center">
  <br />
  <strong>Read the story. Check the evidence. Keep your bearings.</strong>
  <br /><br />
  <a href="https://tidelight.app">Made for the hours between headlines · Tidelight ↗</a>
</div>

For technical contributions or responsible security reports, contact [security@tidelight.app](mailto:security@tidelight.app).

