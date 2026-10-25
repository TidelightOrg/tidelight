# Context.dev developer experience reverse engineering

**Research date:** 2026-10-24
**Method:** authenticated browser inspection of the visible Context.dev workspace, public handbook index, onboarding, and endpoint playgrounds. No account secrets, API key values, customer content, or private request payloads are reproduced here.

## Scope and limits

This is a black-box product and interaction study. It records behavior visible in the browser and public documentation, not Context.dev's private source code, infrastructure, internal database, or undocumented backend. Those implementation details cannot be established from page inspection. The product surface is broad, and the handbook index links to a large catalog; the pages below describe the inspected dashboard route families and shared patterns rather than claiming every handbook article was read line by line.

## Workspace shell

The authenticated workspace uses one persistent left rail, a compact global header, and a route-specific main region. The rail groups product tools separately from workspace administration:

| Group | Routes observed | User task |
| --- | --- | --- |
| Products | Overview, Data APIs, Monitors, Batches, Logo Link | Explore endpoints and run or schedule data collection |
| Workspace | API Keys, Usage, Team | Manage credentials, inspect consumption, manage access |

The header exposes organization switching, global search, help, documentation, account controls, and a remaining-credit control. Route pages keep the same shell so navigation and account context remain stable. The active route is emphasized in the rail; page-specific actions sit in the main content rather than being added to the navigation.

## Page and workflow map

| Page family | Inspected states | Layout and interaction notes |
| --- | --- | --- |
| Overview | Workspace overview and onboarding | Summary-first landing page with product entry points and announcements. Onboarding introduces the workspace and directs users toward the API playground. |
| Data APIs | `scrape`, `scrape-sitemap`, `crawl-website`, `search`, `answers`, `retrieve`, `brand-search`, `styleguide`, `people-enrich`, `people-search`, `company-search`, `news-search`, and `parse` | Shared playground template. Endpoint name and short description anchor the page; request controls occupy the main column while a Parameters panel explains inputs. The page offers integration/code examples and a Result/History area. Endpoint-specific fields change while the surrounding frame stays consistent. |
| Monitors | List and create form | Monitoring is a saved recurring workflow. Creation is a focused form with target/configuration inputs and a primary create action; saved monitors return to the shared workspace shell. |
| Batches | List and create form | Batch work is represented as an asynchronous bulk workflow, separated from one-off API calls. The list-oriented page and creation form keep the same content/card language. |
| Logo Link | Product route | A dedicated product entry in the Products group. It follows the shared product-page shell and directs attention to the tool-specific configuration. |
| API Keys | Key management form and credential table | Project selection, key name, environment, expiration, and permission scopes precede a clear create action. Issued credentials appear in a table with status and permitted key-management actions. Secret values are treated as reveal-on-create material. |
| Usage | Usage summary and Usage Logs tab | Overview metrics lead into a dated/filterable usage history. The log view is a separate tab, preserving the same page context. |
| Team | Members and Pending tabs; invite role selector | Invite controls explain member/admin roles before submission. Team state is split into members and pending invitations; empty states explain the next action. |

## API playground template

The endpoint playground is the most reusable page pattern for Tidelight's developer console:

1. Keep the organization/project and global navigation visible.
2. Lead with a compact endpoint title, purpose, and method/path identity.
3. Put request inputs and the primary run action in the working column.
4. Keep parameter definitions and examples in a stable companion panel.
5. Expose copyable request examples for supported languages near the form.
6. Show result, error, and prior-run history in a distinct response region.
7. Preserve endpoint navigation while changing only endpoint-specific controls and response schemas.

The layout separates *how to call the endpoint* from *what the endpoint returned*. This makes the form scannable and gives first-time users a nearby reference without turning the page into a long document.

## Visual language and responsive observations

The dashboard uses a restrained SaaS workbench style: neutral surfaces, quiet borders, compact labels, clear grouping, and color reserved for current selection, status, or primary actions. It favors predictable page frames and repeated form/table/card components over large promotional sections. The strongest hierarchy comes from spacing, headings, and grouping; the interface avoids decoration that competes with endpoint inputs and output.

The desktop rail/main-column arrangement was directly observed. Responsive behavior should be treated as an implementation decision for Tidelight unless verified at multiple Context.dev viewport sizes; it is not inferred here from desktop screenshots.

## Backend behavior that can and cannot be inferred

Browser-visible forms establish the exposed concepts and workflows: scoped projects, environment-specific keys, permission selection, usage history, saved monitors, batch jobs, and team roles. They do not reveal the provider's internal services or storage design. Tidelight should implement the same user-facing capabilities with its own API, job records, audit trail, authorization checks, and idempotency rules. The existing Tidelight API and MCP implementation remain the source of truth for those behaviors.

## Application to Tidelight

- Keep the developer workspace shell consistent across Console, API Explorer, Research Jobs, Webhooks, Usage, and Security Log.
- Make project, environment, and scope explicit before credential creation; never place secrets in the persistent key table.
- Reuse one endpoint explorer frame across market and research endpoints, with parameter reference, code examples, response output, and run history.
- Present research as a durable job with state, timestamps, source evidence, and a stable detail view; distinguish a submitted job from a completed result.
- Keep monitoring and webhook delivery history separate from one-off requests.
- Use tables for durable administrative records and compact panels for forms and explanatory context.
- Preserve visible evidence boundaries. A blocked or unavailable workflow must be labeled as such rather than presented as a successful run.

## Coverage record

Inspected: workspace shell; overview/onboarding; all 13 listed API playground routes; monitors list/create; batches list/create; Logo Link route; API Keys; Usage and logs; Team members/pending/invite role; public docs root and `llms.txt` index.
Not claimed: private backend architecture, unexposed API behavior, every individual handbook article, or responsive states that were not captured.

## Additional browser observations — 25 October 2026

The following expands the original study with live authenticated Context.dev workspace observations captured in this continuation (browser tab 15, 1365 × 937), plus live public status.context.dev pages. The status-page layout comparison used 1348 × 937. This is browser-visible black-box behavior: private source code and backend internals were not inspected or reverse-engineered. Displayed metrics and defaults describe the captured workspace/form, not universal account limits or backend guarantees.

### Usage: Charts and Logs

**Charts** showed **4 calls**, **2 credits**, **100% successful**, and **0 errors** in the captured view. Its filters were **Source**, **API key**, **Tag**, and **Date range**. These are the observed account values, not Tidelight metrics or an aggregate claim about Context.dev reliability.

**Logs** exposed **API**, **API key**, **Tag**, and **Status** filters. Its request columns were **When / API / Input / Status / Credits / Duration**, with expandable rows, pagination and refresh. The split lets a user move from aggregate consumption to individual request inspection without treating a chart as request-level evidence. Tidelight should retain the same distinction while using its own measured request metadata and permission boundaries; do not import the captured credit figures as Tidelight billing.

### API keys: permission dialog and masked table

The create-key dialog defaults to **Full access**, with **Restricted** as the alternative. Full access describes access to all APIs, account logs, and monitors/batches. The persistent key table masks the value and offers **reveal** and **copy**. This establishes visible credential handling, not a particular at-rest hashing/encryption scheme, reveal authorization mechanism or revocation design. Tidelight should preserve its existing one-time full-secret display, scope enforcement and prefix-only persistent table rather than weakening its security model to copy a reveal affordance.

### Detailed batch controls

The batch form accepts a **URL list**, **sitemap**, or **start URL**, advertising **up to 100,000 URLs**. The visible formats were **HTML / Markdown / Screenshot / Images / Bytes / Parse / JSON / Highlights / Product**. The captured defaults had **Markdown on**, **links on**, and **images off**; **advanced** controls were collapsed. The concurrency display showed **0/1**. That display is an observation of the current UI state, not proof of internal worker concurrency, account-wide throughput or an execution guarantee.

### Detailed monitor controls

The monitor form offers **Page / Sitemap / Whole site** and **Exact / Semantic**, with **Exact** selected by default. It exposes **name**, **tags**, **URL**, **content**, and **advanced** controls, a **schedule** (the observed form showed **6 hours**), **estimated cost**, and an optional **webhook**. The dashboard includes a natural-language fill affordance. Code examples cover **cURL, JavaScript, TypeScript, Ruby, Python, Go and PHP**. These controls establish the exposed configuration choices; no monitor was inferred to have executed, and estimated cost does not establish actual charges, retry policy, scheduler implementation or delivery guarantees.

### Public status: grouped endpoints and archives

[status.context.dev](https://status.context.dev) groups its public components under **Websites**, **APIs**, and **CDN**. Groups expand into individual endpoints, with per-endpoint **90-day uptime** history. Incident and maintenance archives are separate destinations so current availability, past incidents and planned work can be reviewed independently. Endpoint expansion and historic uptime are richer evidence than a single current all-clear badge; they do not expose the private monitoring backend or prove the underlying measurement method.

### Tidelight comparison and database-probe discrepancy

At the time of the live comparison, Tidelight rendered a light page with every group inline; it did not match the reference. Context.dev uses a dark background and a centered approximately 810 px panel, slim top navigation, a strong overall-state banner, a dark bordered service card, expandable category rows (Websites open; APIs and CDN collapsed), component states and 90-day uptime bars, and a compact provider footer. This change adopts the dark, centered structure in Tidelight branding with native keyboard-accessible accordions; Tidelight shows history-not-yet-available notices until scheduled measurements exist.

Tidelight's [status site](https://status.tidelight.app), [incident archive](https://status.tidelight.app/incidents), and [maintenance archive](https://status.tidelight.app/maintenance) use its own standalone branded shell and service grouping. Its current probes cover application/developer surfaces, packages, API/MCP and database access. These current observations are not equivalent to Context.dev's measured per-endpoint 90-day uptime. Do not manufacture historic uptime from a point-in-time check or populate incident/maintenance archives with invented events.

The observed database signals disagree: Supabase reports the Tidelight project **ACTIVE_HEALTHY**, and a read-only **SELECT 1** succeeds, while the live status page reports that its **DB probe failed**. The management-plane health and read-only SQL check were independently reconfirmed in this continuation. This does not prove that the deployed application's database path works. In the inspected Tidelight source, the status probe uses the application's admin client to select an ID from `developer_api_keys`; it does not execute the same SELECT 1. The two probes exercise different credentials, network paths and permissions. Record the live page as degraded while investigating that application probe; do not call the database globally down or silently turn the page green based on the management query. No root cause or repair is established by these observations.
## Additional interaction details captured 2026-10-25

The workspace was revisited at a 1365 × 937 desktop viewport to inspect the usage log, key creation, and saved-workflow forms more closely. These notes describe visible behavior, not implementation internals.

### Shell and visual hierarchy

- A narrow, persistent left rail holds the workspace switcher/search at the top; product routes and workspace administration are separated by small section labels. Plan/help/documentation/account actions sit at the bottom of the rail.
- The remaining-credit control sits at the upper right. The page content is centered in the available space with a restrained width; usage charts and logs use a single bordered white panel with subtle dividers.
- Heading, one-line explanation, and page controls form a compact top region. Labels and icon buttons are small and low contrast; selected navigation and primary actions carry the strongest color. A dismissible product announcement is anchored at the lower right.
- The same global shell remains visible while the main region changes. Usage switches between Charts and Logs without leaving its route family; the selected view is represented in the URL (`?view=logs`).

### Usage charts and request log

Charts view begins with four summary values (API calls, credits, daily average, successful-call rate/errors), then shows calls per day with an API calls/credits toggle, API breakdown, response-status breakdown, authentication-status breakdown, and key breakdown. Filters cover source, API key, tag, and date range. The inspected workspace showed 4 calls and 2 credits for the last 30 days, all returning HTTP 200 with valid authentication.

Logs view is a compact request table with a search field and filters for API, API key, tag, and status. Columns are When, API, Input, Status, Credits, and Duration; rows can expand for request detail. Pagination and a last-refreshed timestamp keep the log usable without turning the page into a dense raw event dump. Input values are user content and are intentionally not copied into this report.

### API key creation

The key page presents a searchable table with Name, masked Key, Permissions, Status, Usage, and Actions. A create dialog asks for a name and an access mode. The observed default is **Full access**, described in the UI as permission to call every API, read account logs, and manage monitors and batches. **Restricted** is the alternative. The page also explains plan-based key limits and offers a separate plan action. Key material remains masked in the persistent table, with explicit reveal and copy controls; creation is a distinct primary action in the dialog.

### Saved collection workflows

The batch creation dialog provides Dashboard and Code modes, then target choices for a list of URLs, a sitemap, or a crawl starting from a URL. URL lists accept one URL per line (up to 100,000). Output controls include HTML, Markdown, screenshot, images, bytes, parse, JSON, highlights, and product data; Markdown is initially selected, links are on, and images are off. Advanced options begin collapsed. The page surfaces concurrency and explains that credits are reserved per page before submission.

Monitor creation similarly separates Dashboard and Code modes. The dashboard supports an optional natural-language description that fills a reviewable configuration form. Target choices are page, sitemap, or whole site. The form exposes name, tags, URL, Exact/Semantic detection (Exact initially selected), page content, advanced options, a schedule, estimated cost per run, and an optional webhook destination. Code mode offers cURL plus JavaScript, TypeScript, Ruby, Python, Go, and PHP examples, with Axios/SDK variants where available. The API key is masked in the example UI and can be copied through an explicit action.

### Reverse-engineering boundary

The request table, key dialog, and job setup forms expose the customer-facing contract and interaction sequence. They do not reveal database schemas, queue providers, private service topology, source implementation, authorization middleware, or execution algorithms. Any Tidelight backend comparison should be based on Tidelight's own implementation and public API behavior, not asserted as a copy of Context.dev internals.

### Public service status

The separate `status.context.dev` experience is a concise service dashboard with a top navigation for Status, Maintenance, Previous incidents, and contact. Its headline summarizes the overall state (“All services are online” in the inspected session). The status page groups services into Websites, APIs, and CDN; each group can expand to show named components, an operational state, and a 90-day uptime strip. API components are listed by endpoint rather than collapsed into a single generic API check. Component rows with incident impact link to the relevant incident record.

The incident archive groups entries by month and shows title, resolved state, resolution time, a short update, and a count of prior updates. The maintenance archive uses a parallel month grouping with an explicit “No maintenance scheduled” state. Both archive routes keep the same sparse header and footer, so operational history is reachable without competing with the main status summary. The inspected status shell identifies Better Stack as its provider. These are observed presentation and navigation details; the dashboard's private monitoring configuration and probe implementation are not visible.

## Tidelight implementation comparison

The live `status.tidelight.app` page now uses the same high-level status pattern: persistent status navigation, a one-line global state, grouped ecosystem services, and separate maintenance and incident routes. It lists Tidelight's website, REST and research APIs, MCP metadata, npm and PyPI registries, database, and background execution/delivery observability. It explicitly labels research processing, scheduling, and delivery as not monitored instead of drawing historical uptime bars without a history source. The page's live database probe reported a connection failure during this inspection; the Supabase project itself reported `ACTIVE_HEALTHY`, and a read-only `select 1` returned successfully through the connected database tool. That discrepancy is recorded as a probe/runtime issue to investigate, not as evidence that the database is down.
## Public site and API surface comparison — 25 October 2026

Fresh public-site review covered Context.dev homepage, /data, /search (redirects to /search-api), /monitors (redirects to /monitors-api), Search API, Data Extraction API, and monitoring use case. Tidelight's remaining gap is the direct path from each capability to its endpoint-specific runnable console example and inspectable response. Do not invent account activity when no data exists.

On narrow mobile widths, keep endpoint identity and primary action first, put parameters in a disclosure, keep results and request history below controls, and contain wide code or tables within their own scroll area. These are implementation recommendations from public desktop inspection and the supplied mobile-desktop screenshots; authenticated Context.dev mobile behavior was not inspected.

## Status history comparison — 25 October 2026

Context.dev's monitor workflow surfaces recurring runs, last result, history/diffs, and webhook delivery. Tidelight now has scheduled status samples and detected incidents with explicit coverage boundaries. Its 90-day timeline must mark missing observations as no data and avoid inferring uptime.