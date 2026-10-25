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
