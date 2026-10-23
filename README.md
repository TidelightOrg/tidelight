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
  <img src="./docs/readme-assets/tidelight-macbook.png" alt="Tidelight's Tidelight research connects a company event to its evidence and potential market exposure." width="100%" />
</p>

<p align="center"><sub>A calmer research desk for the hours between headlines.</sub></p>

---

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

Start with [**Judge Mode**](https://tidelight.app/judge) for the five-minute product path. The records below are owner-published artifacts with explicit limitations.

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
| [rNVDA replay](https://tidelight.app/replay/c2ffbe89-74a5-4547-bf89-5952e37efeaa) · [JSON](https://tidelight.app/api/research/replays/c2ffbe89-74a5-4547-bf89-5952e37efeaa?format=json) | Earlier tokenized-market review | Original owner-published run; inspect its own captured limitations and gate. |
| [NVDA + TSLA replay](https://tidelight.app/replay/91bb478a-7977-4b34-b32d-b1f558a8af75) · [JSON](https://tidelight.app/api/research/replays/91bb478a-7977-4b34-b32d-b1f558a8af75?format=json) | Compare issuer evidence and risks | Earlier owner-published comparison; inspect both source sets and separate gates. |

**Evidence boundary:** The five new runs collected issuer headlines, but all reported “AI synthesis unavailable,” and the replay pages show no source-linked supporting or opposing claim points. These are transparent research workflow and fallback records, not finished analyst theses. Tidelight made no directional assessment and showed no trade handoff. Quote snapshots are historical to each run, not live prices.

</details>

<details>
<summary><strong>Open Nightwatch position captures · 22 Oct 2026</strong></summary>

The public exhibit presents three historical Nightwatch paper positions. The source reports 23 decisions, five paper orders, and three open positions; only the pictured positions are included. Raw order rows, account identifiers, balances, and internal record IDs are excluded.

![Nightwatch rNVD paper position capture](https://tidelight.app/judge-evidence/nightwatch-rnvd-position.png)

![Nightwatch rAAPL paper position capture](https://tidelight.app/judge-evidence/nightwatch-raapl-position.png)

![Nightwatch rGOOGL paper position capture](https://tidelight.app/judge-evidence/nightwatch-rgoogl-position.png)

See the [sanitized position summary JSON](https://tidelight.app/evidence/nightwatch-position-captures.json) or [view the image set in Judge Mode](https://tidelight.app/judge#nightwatch-position-captures). These are simulated marks captured on different dates, not exchange transactions, audited returns, current prices, or a live query of the current account ledger.

</details>

## Research data and trading artifacts

<details>
<summary><strong>Open the public JSON index and data boundaries</strong></summary>

- [Public evidence manifest JSON](https://tidelight.app/evidence/manifest.json) — route inventory, reproducibility requirements, and evidence limitations.
- Each replay row links to its downloadable, sanitized JSON record. The export is the same selected public payload shown on the replay page, not the private full account run.
- Strategy Lab can export an authenticated owner's individual strategy run as JSON. No positive alpha result or public trade ledger is attached here.
- Nightwatch fills remain private until the owner publishes an individual sanitized replay. [Open the public Nightwatch replay directory](https://tidelight.app/nightwatch/replays); each trade replay omits identity, balances, and unrelated ledger rows.
- The [Nightwatch position summary JSON](https://tidelight.app/evidence/nightwatch-position-captures.json) describes the supplied historical images only; the original private account export is not published.
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
| [Nightwatch paper replays](https://tidelight.app/nightwatch/replays) | Review owner-published, sanitized trade replays. |
| [Futures paper desk](https://tidelight.app/futures) | Rehearse stock-perpetual ideas in a simulated paper environment. No exchange orders are placed. |
| [Research community](https://tidelight.app/community) | Explore the community research surface. |
| [Saved briefs](https://tidelight.app/briefs) | Review saved research briefs when signed in. |
| [Exchange workspace](https://tidelight.app/trading) | Inspect the Bitget workspace and its exchange controls; live trading is disabled. |

### Developer platform

| Visit | What it does |
| --- | --- |
| [Developer portal](https://tidelight.app/developers) | Overview of the API, SDKs, and integration options. |
| [Developer documentation](https://dev.tidelight.app) | API reference, quickstarts, SDK guides, webhooks, and MCP setup. |
| [Developer console](https://tidelight.app/developers/console) | Manage developer projects and credentials. |
| [Package platform](https://package.tidelight.app) | Browse Tidelight SDKs and integration packages. |
| [Package dashboard](https://package.tidelight.app/dashboard) | View package and integration workspace options. |
| [REST API base](https://api.tidelight.app/v1) | Public API base URL; use the developer docs for endpoint details and authentication. |
| [Remote MCP endpoint](https://mcp.tidelight.app/mcp) | Streamable HTTP endpoint for MCP clients; see the developer docs for connection instructions. |

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

