import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { PlatformNav } from "./platform-nav";
import { IntelligenceUiPreview } from "./intelligence-ui-preview";
import "./tidelight-developers.css";
import "./platform-polish.css";
import "./cloud-landing.css";
import "./intelligence-ui-preview.css";

export const metadata: Metadata = {
  title: { absolute: "Tidelight Intelligence Cloud — Market intelligence infrastructure" },
  description: "Build with Tidelight's source-aware market and research services through a scoped API, remote MCP, and developer console.",
  alternates: { canonical: "https://tidelight.app/developers" },
};

const routeCards = [
  { number: "01", label: "REST API", host: "api.tidelight.app", path: "/v1", note: "Versioned, scoped requests", href: "https://api.tidelight.app/v1" },
  { number: "02", label: "REMOTE MCP", host: "mcp.tidelight.app", path: "/mcp", note: "Streamable HTTP · OAuth", href: "https://mcp.tidelight.app/mcp" },
  { number: "03", label: "DOCUMENTATION", host: "dev.tidelight.app", path: "/", note: "Guides and API reference", href: "https://dev.tidelight.app" },
  { number: "04", label: "INTEGRATION GUIDES", host: "tidelight.app", path: "/developers/integrations", note: "Choose between API, MCP, and packages", href: "https://tidelight.app/developers/integrations" },
];

export default function DevelopersPage() {
  return <main className="tic tic-landing tic-premium-landing">
    <PlatformNav active="platform" />

    <section className="tic-premium-hero">
      <div className="tic-hero-copy">
        <p className="tic-eyebrow"><span className="tic-status-dot"/> TIDELIGHT DEVELOPER PLATFORM</p>
        <h1>Intelligence,<br/><em>ready to build on.</em></h1>
        <p className="tic-hero-description">Bring Tidelight’s source-aware market and research capabilities into your products, services, and AI workflows.</p>
        <div className="tic-actions"><Link className="tic-button tic-primary" href="https://tidelight.app/developers/console">Start building <span aria-hidden="true">→</span></Link><Link className="tic-button tic-secondary" href="https://dev.tidelight.app">Explore the docs <span aria-hidden="true">↗</span></Link></div>
        <div className="tic-hero-assurances"><span><i>01</i> Evidence stays attached</span><span><i>02</i> Access stays scoped</span><span><i>03</i> Your account stays in control</span></div>
      </div>
      <figure className="tic-hero-art tic-motion-hero">
        <picture className="tic-motion-picture">
          <source media="(max-width: 520px)" srcSet="/tic-motion-mobile.svg" />
          <Image src="/tic-motion-visual.svg" alt="Conceptual workflow illustration: a research signal gains source context before reaching scoped API and MCP access. This is not a live request." width={1000} height={540} priority sizes="(max-width: 760px) 100vw, 48vw" />
        </picture>
        <figcaption>CONCEPTUAL WORKFLOW · NOT LIVE REQUEST ACTIVITY</figcaption>
      </figure>
    </section>

    <section className="tic-platform-strip" aria-label="Platform services">
      <p>Service directory</p>
      <div>{routeCards.map(card => <Link href={card.href} key={card.number} className="tic-route-card"><div><strong>{card.label}</strong><small>{card.note}</small></div><code>{card.host}{card.path}</code><span className="tic-route-arrow" aria-hidden="true">↗</span></Link>)}</div>
    </section>

    <section className="tic-capability-examples" aria-labelledby="tic-capability-examples-title">
      <header className="tic-capability-examples-heading">
        <p className="tic-eyebrow">THREE CONTRACT-BACKED ENTRY POINTS</p>
        <h2 id="tic-capability-examples-title">Start with the capability your product needs.</h2>
        <p>These examples follow the published REST and MCP contracts. They are not sent from this page; use a project credential in the authenticated console.</p>
      </header>
      <div className="tic-capability-examples-grid">
        <article className="tic-capability-example">
          <div className="tic-capability-example-top"><span>01 / MARKET DATA</span><span className="tic-capability-example-method">REST · GET</span></div>
          <h3>Look up a tokenized equity.</h3>
          <p>List supported Reality tokenized-equity spot instruments, optionally filtered by the underlying US stock ticker.</p>
          <div className="tic-capability-code-label">REQUEST SHAPE</div>
          <pre><code>{"GET https://api.tidelight.app/v1/market/instruments?kind=rtoken&limit=20&underlying_ticker=NVDA\nAuthorization: Bearer $TIDELIGHT_API_KEY"}</code></pre>
          <div className="tic-capability-code-label">200 RESPONSE ENVELOPE</div>
          <pre><code>{"data: Instrument[]\nnext_cursor: string | null\ngenerated_at: Unix milliseconds\nrequest_id: UUID"}</code></pre>
          <p className="tic-capability-example-limit">These are tokenized spot products, not direct stock shares or stock perpetuals. Market data may return 503 when the provider is unavailable or redistribution terms are unconfirmed.</p>
          <div className="tic-capability-example-actions">
            <Link href="https://tidelight.app/developers/console">Open console → API explorer</Link>
            <Link href="https://dev.tidelight.app/#reference">API reference ↗</Link>
          </div>
        </article>

        <article className="tic-capability-example">
          <div className="tic-capability-example-top"><span>02 / COMPANY RESEARCH</span><span className="tic-capability-example-method">REST · POST</span></div>
          <h3>Queue an async research snapshot.</h3>
          <p>Start a durable job for a supported US stock, then read its status and completed, source-linked evidence snapshot.</p>
          <div className="tic-capability-code-label">REQUEST SHAPE</div>
          <pre><code>{"POST https://api.tidelight.app/v1/research/jobs\nAuthorization: Bearer $TIDELIGHT_API_KEY\nIdempotency-Key: research-example-001\n\n{\"ticker\":\"NVDA\"}\n\nGET /v1/research/jobs/{job_id}"}</code></pre>
          <div className="tic-capability-code-label">202 ACCEPTED RESPONSE</div>
          <pre><code>{"job_id: UUID\nstatus: queued | running | retry_wait | complete | failed | cancelled\nduplicate: boolean\nrequest_id: UUID"}</code></pre>
          <p className="tic-capability-example-limit">Requires the <code>research:run</code> scope and an 8–128 character idempotency key. Each project can start up to 10 jobs per rolling hour. The result can be null until completion; research is not a recommendation or valuation.</p>
          <div className="tic-capability-example-actions">
            <Link href="https://tidelight.app/developers/console">Open console → API explorer</Link>
            <Link href="https://dev.tidelight.app/#research">Research job guide ↗</Link>
          </div>
        </article>

        <article className="tic-capability-example">
          <div className="tic-capability-example-top"><span>03 / AGENT INTEGRATION</span><span className="tic-capability-example-method">REMOTE MCP</span></div>
          <h3>Connect a client over Streamable HTTP.</h3>
          <p>Use the hosted MCP endpoint to discover and call supported market and research tools from a compatible client.</p>
          <div className="tic-capability-code-label">SERVER ENDPOINT</div>
          <pre><code>{"https://mcp.tidelight.app/mcp"}</code></pre>
          <div className="tic-capability-code-label">EXAMPLE TOOL INPUT</div>
          <pre><code>{"tidelight_search_tokenized_equities({\n  underlying_ticker: \"NVDA\",\n  limit: 5\n})"}</code></pre>
          <div className="tic-capability-code-label">TOOL RESULT SHAPE</div>
          <pre><code>{"structuredContent: { data: Instrument[], next_cursor: string | null, generated_at: number, request_id: string }\ncontent: [{ type: \"text\", text: JSON.stringify(structuredContent) }]"}</code></pre>
          <p className="tic-capability-example-limit">The server exposes tools allowed by the credential’s existing scopes: market lookup uses <code>market:read</code>; company research uses <code>research:run</code>. Client authorization and project limits still apply.</p>
          <div className="tic-capability-example-actions">
            <Link href="https://tidelight.app/developers/console">Open console → API explorer</Link>
            <Link href="https://dev.tidelight.app/#mcp">MCP connection guide ↗</Link>
          </div>
        </article>
      </div>
      <p className="tic-capability-examples-footnote">The link opens the developer console; sign in if prompted, then choose API explorer. Credentials are project-scoped; this public page never sends a request or stores a key.</p>
    </section>

    <section className="tic-cloud-workspace" aria-labelledby="tic-cloud-workspace-title">
      <div className="tic-cloud-workspace-copy">
        <p className="tic-eyebrow">THE DEVELOPER WORKSPACE</p>
        <h2 id="tic-cloud-workspace-title">From first key to every request, in view.</h2>
        <p>Projects, scoped credentials, research jobs, MCP access, and webhook delivery live in one considered workspace. Each area keeps its controls close to the evidence you need to review.</p>
        <Link href="https://tidelight.app/developers/console">Explore the Intelligence Cloud console <span aria-hidden="true">→</span></Link>
      </div>
      <figure className="tic-workspace-preview" aria-label="Illustrative preview of the Tidelight Intelligence Cloud developer console; no account data is shown">
        <figcaption><span>INTELLIGENCE CLOUD</span><span className="tic-workspace-demo">ILLUSTRATIVE PREVIEW</span></figcaption>
        <div className="tic-workspace-frame">
          <aside aria-hidden="true"><span className="tic-workspace-mark">t.</span><span className="is-current">Overview</span><span>Projects</span><span>Credentials</span><span>Research jobs</span><span>Request usage</span><span>Security</span></aside>
          <div className="tic-workspace-content">
            <div className="tic-workspace-heading"><div><small>WORKSPACE / OVERVIEW</small><strong>Your developer workspace</strong></div><span>PRIVATE</span></div>
            <div className="tic-workspace-summary"><div><small>PROJECTS</small><b>Organize integrations</b><i>Separate access by application</i></div><div><small>ACCESS</small><b>Scoped by project</b><i>Rotate or revoke credentials</i></div><div><small>OBSERVABILITY</small><b>Review actual activity</b><i>Requests, jobs, and delivery</i></div></div>
            <div className="tic-workspace-lower"><div><small>BUILD FLOW</small><b><span>01</span> Create a project</b><b><span>02</span> Select access scopes</b><b><span>03</span> Make an authorized request</b></div><div className="tic-workspace-orbit"><i/><i/><i/><span>ONE<br/>SHARED<br/>CORE</span></div></div>
          </div>
        </div>
      </figure>
    </section>

    <section className="tic-intelligence-showcase" aria-labelledby="tic-intelligence-showcase-title">
      <div className="tic-intelligence-showcase-copy"><p className="tic-eyebrow">INTELLIGENCE, MADE INTERACTIVE</p><h2 id="tic-intelligence-showcase-title">Make the evidence part of the interface.</h2><p>Give people a clear path from a question to its sources and structured response. The same scoped Tidelight services can power a calm, source-aware experience inside your own product.</p><Link href="https://package.tidelight.app/react">Explore the React package <span aria-hidden="true">→</span></Link></div>
      <IntelligenceUiPreview />
    </section>

    <section className="tic-core-render"><div className="tic-core-copy"><p className="tic-eyebrow">ONE SHARED INTELLIGENCE CORE</p><h2>Different interfaces.<br/><em>One source-aware foundation.</em></h2><p>The API and remote MCP server expose supported Tidelight capabilities through the same service boundaries. The developer console keeps keys, activity, and access under your account.</p><div className="tic-core-pills"><span>SHARED SERVICES</span><i/><span>SCOPED ACCESS</span><i/><span>VISIBLE ACTIVITY</span></div></div><Image src="/tic-intelligence-glass.webp" alt="Abstract translucent glass illustration of one central intelligence service connected to three developer interfaces" width={1536} height={1024} sizes="(max-width: 760px) 100vw, 50vw" className="tic-core-image" /></section>

    <section className="tic-capabilities">
      <div className="tic-section-heading"><p className="tic-eyebrow">A CONNECTED WORKFLOW</p><h2>One platform. Clear boundaries.</h2><p>Move from authorized requests to inspectable work, with the same access rules across interfaces.</p></div>
      <div className="tic-capability-grid">
        <article className="tic-capability-card tic-capability-featured"><span className="tic-card-index">01 / ACCESS</span><div className="tic-card-visual tic-access-visual"><i/><i/><i/><span>RESEARCH:READ</span></div><h3>Credentials with intent</h3><p>Project keys are scope-limited, shown once, stored as hashes, and can be rotated or revoked from your console.</p><Link href="https://tidelight.app/developers/console">Manage credentials <span aria-hidden="true">→</span></Link></article>
        <article className="tic-capability-card"><span className="tic-card-index">02 / RESEARCH</span><div className="tic-card-visual tic-research-visual"><span>REQUEST</span><i/><span>JOB</span><i/><span>SNAPSHOT</span></div><h3>Long work, tracked</h3><p>Company research uses durable jobs with status, bounded retries, and explicit cancellation.</p><Link href="https://dev.tidelight.app#research">See research jobs <span aria-hidden="true">→</span></Link></article>
        <article className="tic-capability-card"><span className="tic-card-index">03 / VISIBILITY</span><div className="tic-card-visual tic-usage-visual" role="img" aria-label="Illustrative chart treatment only; no live account activity is shown"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div><h3>Activity you can inspect</h3><p>Review actual authorized requests, timing, response status, credential history, and webhook delivery.</p><Link href="https://tidelight.app/developers/console">Open developer console <span aria-hidden="true">→</span></Link></article>
      </div>
    </section>

    <section className="tic-cta-band"><div><p className="tic-eyebrow">BUILD WITH TIDELIGHT</p><h2>Start with the service that fits your workflow.</h2><p>Set up a project, grant only what you need, then explore the live API or connect an MCP client.</p></div><div><Link href="https://tidelight.app/developers/console" className="tic-button tic-primary">Open developer console <span aria-hidden="true">→</span></Link><Link href="https://dev.tidelight.app#quickstart" className="tic-cta-text">Read the quickstart ↗</Link></div></section>
    <footer className="tic-footer tic-premium-footer"><Link href="/developers" className="tic-brand"><Image src="/tidelight-mark.svg" alt="" width={24} height={24}/><span className="tic-brand-name">Tidelight</span><span>Intelligence Cloud</span></Link><span>Source-aware intelligence infrastructure</span><div><Link href="https://package.tidelight.app">Packages</Link><Link href="https://dev.tidelight.app">Documentation</Link><Link href="https://tidelight.app/developers/console">Console</Link><Link href="https://github.com/TidelightOrg/tidelight" target="_blank" rel="noreferrer">GitHub ↗</Link><Link href="https://x.com/TidelightOrg" target="_blank" rel="noreferrer">X ↗</Link><Link href="/">Tidelight home</Link></div></footer>
  </main>;
}
