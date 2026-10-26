import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { PlatformNav } from "../platform-nav";
import "../tidelight-developers.css";
import "../platform-polish.css";
import "./integrations.css";

export const metadata: Metadata = {
  title: { absolute: "Tidelight Integrations — API, MCP, and SDKs" },
  description: "Choose a verified Tidelight integration path for your product, AI client, or developer workflow.",
  alternates: { canonical: "https://tidelight.app/developers/integrations" },
};

const packages = [
  { name: "TypeScript SDK", href: "https://package.tidelight.app/sdk" },
  { name: "Python SDK", href: "https://package.tidelight.app/python" },
  { name: "React", href: "https://package.tidelight.app/react" },
  { name: "CLI", href: "https://package.tidelight.app/cli" },
] as const;

export default function DeveloperIntegrationsPage() {
  return <main className="tic tic-landing tic-integration-page">
    <PlatformNav active="platform" />

    <header className="tic-integration-hero">
      <div className="tic-integration-hero-copy">
        <p className="tic-eyebrow"><span className="tic-status-dot" /> INTEGRATION DIRECTORY</p>
        <h1>Connect Tidelight to <em>your workflow.</em></h1>
        <p>Choose the interface that fits your product, AI client, or development stack. Each path uses the same scoped Tidelight services.</p>
        <div className="tic-integration-hero-actions">
          <Link className="tic-button tic-primary" href="https://tidelight.app/developers/console">Start with a project <span aria-hidden="true">→</span></Link>
          <Link className="tic-button tic-secondary" href="https://dev.tidelight.app/#quickstart">Read the quickstart <span aria-hidden="true">↗</span></Link>
        </div>
      </div>
      <div className="tic-integration-map" role="img" aria-label="Integration directory illustration showing project access connecting to Tidelight services and the REST API and remote MCP.">
        <div className="tic-integration-map-label">ONE PROJECT · SCOPED ACCESS</div>
        <div className="tic-integration-map-flow">
          <span className="tic-integration-map-node is-origin"><i aria-hidden="true">01</i><b>Project key</b><small>Selected scopes</small></span>
          <span className="tic-integration-map-link" aria-hidden="true"><i /></span>
          <span className="tic-integration-map-node is-service"><i aria-hidden="true">02</i><b>Tidelight services</b><small>Shared authorization</small></span>
          <span className="tic-integration-map-branches" aria-hidden="true"><i /><i /></span>
          <div className="tic-integration-map-outputs"><span className="tic-integration-map-node"><i aria-hidden="true">API</i><b>REST</b><small>Versioned endpoints</small></span><span className="tic-integration-map-node"><i aria-hidden="true">MCP</i><b>AI clients</b><small>Scoped tools</small></span></div>
        </div>
        <p>Requests, scopes, and evidence stay on the same service boundary.</p>
      </div>
    </header>

    <section className="tic-integration-paths" aria-labelledby="tic-integration-paths-title">
      <div className="tic-integration-section-head"><div><p className="tic-eyebrow">START WHERE YOU BUILD</p><h2 id="tic-integration-paths-title">Choose a connection path.</h2><p>Use an API, an MCP transport, or a package maintained for your stack.</p></div><Link href="https://package.tidelight.app">Browse all packages <span aria-hidden="true">↗</span></Link></div>

      <div className="tic-integration-grid">
        <article className="tic-integration-card">
          <div className="tic-integration-card-top"><span className="tic-integration-card-icon" aria-hidden="true">01</span><span className="tic-integration-card-kind">HTTP API</span></div>
          <h3>Build with the REST API.</h3>
          <p>Make versioned, server-side requests with project-scoped credentials. Start research jobs, check their status, read supported market instruments, and receive job webhooks.</p>
          <div className="tic-integration-card-details"><span>Base URL</span><code>api.tidelight.app/v1</code><span>Access</span><code>Scoped bearer key</code></div>
          <Link className="tic-integration-card-link" href="https://dev.tidelight.app/#quickstart">Open API quickstart <span aria-hidden="true">→</span></Link>
        </article>

        <article className="tic-integration-card is-featured">
          <div className="tic-integration-card-top"><span className="tic-integration-card-icon" aria-hidden="true">02</span><span className="tic-integration-card-kind">REMOTE MCP</span></div>
          <h3>Connect an AI client.</h3>
          <p>Use Tidelight’s hosted Streamable HTTP MCP endpoint. Authenticate with a scoped bearer key or OAuth 2.1 with PKCE when the client supports it.</p>
          <div className="tic-integration-card-details"><span>Endpoint</span><code>mcp.tidelight.app/mcp</code><span>Access</span><code>Tools follow key scopes</code></div>
          <Link className="tic-integration-card-link" href="https://dev.tidelight.app/#mcp">Read the remote MCP guide <span aria-hidden="true">→</span></Link>
        </article>

        <article className="tic-integration-card">
          <div className="tic-integration-card-top"><span className="tic-integration-card-icon" aria-hidden="true">03</span><span className="tic-integration-card-kind">LOCAL MCP</span></div>
          <h3>Bridge a stdio-only host.</h3>
          <p>The published Node.js bridge connects a local stdio MCP client to the hosted Tidelight service. The service validates credentials, filters tools by scope, and applies quotas.</p>
          <div className="tic-integration-card-details"><span>Package</span><code>@tidelight/mcp</code><span>Transport</span><code>Local stdio → remote HTTP</code></div>
          <Link className="tic-integration-card-link" href="https://package.tidelight.app/mcp">View the MCP bridge setup <span aria-hidden="true">→</span></Link>
        </article>

        <article className="tic-integration-card">
          <div className="tic-integration-card-top"><span className="tic-integration-card-icon" aria-hidden="true">04</span><span className="tic-integration-card-kind">OFFICIAL PACKAGES</span></div>
          <h3>Use the tools for your stack.</h3>
          <p>Start from a maintained client package, React interface, or command line workflow. The package guides include install commands, examples, release details, and source links.</p>
          <div className="tic-integration-package-links">{packages.map(item => <Link key={item.name} href={item.href}>{item.name}<span aria-hidden="true">↗</span></Link>)}</div>
          <Link className="tic-integration-card-link" href="https://package.tidelight.app">Explore packages <span aria-hidden="true">→</span></Link>
        </article>
      </div>
    </section>

    <section className="tic-integration-compatibility" aria-labelledby="tic-integration-compatibility-title">
      <div className="tic-integration-compatibility-mark" aria-hidden="true"><span /><i /><i /><i /></div>
      <div><p className="tic-eyebrow">CLIENT COMPATIBILITY</p><h2 id="tic-integration-compatibility-title">A protocol path is not a client certification.</h2><p>The hosted service supports Streamable HTTP, bearer authorization, and OAuth discovery. MCP Inspector 2.11.0 has a recorded authenticated production connection and scoped market-tool call. Each client’s setup and authorization flow can differ, so follow its own connection settings and verify access using the scopes on your project key.</p></div>
      <Link href="https://dev.tidelight.app/#mcp-clients">Review current compatibility notes <span aria-hidden="true">↗</span></Link>
    </section>

    <section className="tic-integration-next" aria-label="Create a Tidelight developer project">
      <div><p className="tic-eyebrow">READY TO CONNECT</p><h2>Create a project, then choose your scopes.</h2><p>The console keeps credentials, requests, research jobs, and access history together.</p></div>
      <Link className="tic-button tic-primary" href="https://tidelight.app/developers/console">Open the developer console <span aria-hidden="true">→</span></Link>
    </section>

    <footer className="tic-footer"><Link href="https://tidelight.app/developers" className="tic-brand"><Image src="/tidelight-mark.svg" alt="" width={23} height={23}/><span className="tic-brand-name">Tidelight</span><span>Developer platform</span></Link><div><Link href="https://dev.tidelight.app">Documentation</Link><Link href="https://package.tidelight.app">Packages</Link><Link href="https://tidelight.app/developers/console">Developer console</Link><Link href="https://status.tidelight.app">System status</Link><Link href="https://github.com/TidelightOrg/tidelight" target="_blank" rel="noreferrer">GitHub ↗</Link></div></footer>
  </main>;
}
