import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { PlatformNav } from "../platform-nav";
import { packageCatalog } from "./catalog.generated";
import { PackageWorkbench } from "./package-workbench";
import { PackageRegistryCard } from "./registry-facts";
import { PackageOrbit3D } from "./package-orbit-3d";
import "../tidelight-developers.css";
import "../platform-polish.css";
import "./packages.css";
import "./registry-live.css";

export const metadata: Metadata = {
  title: { absolute: "Official packages — Tidelight Intelligence Cloud" },
  description: "Explore Tidelight's official developer packages, their current release status, and source-backed installation guidance.",
  alternates: { canonical: "https://tidelight.app/developers/packages" },
};



export default function DeveloperPackagesPage() {
  return <main className="tic tic-landing tic-packages-page">
    <PlatformNav active="packages" />
    <PackageWorkbench />
    <header className="tic-packages-hero">
      <div><p className="tic-eyebrow"><span className="tic-status-dot"/> OFFICIAL DEVELOPER PACKAGES</p><h1>One intelligence layer.<br/><em>Every developer workflow.</em></h1><p>Five first-party packages, published from the Tidelight mother repository. Versions and install details are refreshed from npm and PyPI.</p>
        <div className="tic-package-hero-meta"><span><i>01</i> Mother repository: <code>TidelightOrg/tidelight</code></span><span><i>02</i> Registries: <code>npm · PyPI · GHCR</code></span></div><div className="tic-package-hero-actions"><Link className="tic-button tic-primary" href="#package-directory-title">Browse packages <span aria-hidden="true">↓</span></Link><Link className="tic-button" href="https://dev.tidelight.app#sdks">Read the developer quickstart <span aria-hidden="true">→</span></Link></div>
      </div>
      <div className="tic-package-constellation" role="img" aria-label="Tidelight's shared API connects the SDK, MCP, Python, React, and CLI packages. On supported desktop browsers, the 3D constellation gently rotates and responds to pointer movement; a static version remains available everywhere.">
        <PackageOrbit3D />
        <div className="tic-package-orbit tic-orbit-one"/><div className="tic-package-orbit tic-orbit-two"/><div className="tic-package-core"><span>ONE CORE</span><strong>TIDELIGHT</strong><small>API · AUTH · CONTRACTS</small></div>
        <span className="tic-package-node node-sdk">SDK <small>source present</small></span><span className="tic-package-node node-mcp">MCP <small>source present</small></span><span className="tic-package-node node-python">PYTHON <small>source present</small></span><span className="tic-package-node node-react">REACT <small>source present</small></span><span className="tic-package-node node-cli">CLI <small>source present</small></span>
        <span className="tic-package-connector connector-a"/><span className="tic-package-connector connector-b"/><span className="tic-package-connector connector-c"/><span className="tic-package-connector connector-d"/><span className="tic-package-connector connector-e"/>
      </div>
    </header>
    <section className="tic-package-directory" aria-labelledby="package-directory-title">
      <div className="tic-package-section-head"><div><p className="tic-eyebrow">PACKAGE DIRECTORY / 05</p><h2 id="package-directory-title">Choose your entry point</h2><p>Live package versions, registry links, and installation commands are refreshed from the public registries.</p></div><span className="tic-package-live-label"><i/> npm · PyPI</span></div>
      <div className="tic-package-grid">{packageCatalog.map((item, index) => <PackageRegistryCard key={item.id} packageId={item.id} name={item.display.name} summary={item.display.summary} href={item.display.href} glyph={item.display.glyph} ecosystem={item.display.ecosystem} index={index} />)}</div>
    </section>
    <section className="tic-package-policy"><div><p className="tic-eyebrow">TRUST BEFORE INSTALL</p><h2>Release status stays visible.</h2></div><p>Install the exact versions shown on npm and PyPI. Every package page links to its registry and canonical source in the mother repository.</p><Link href="https://dev.tidelight.app#sdks">Read the developer guides <span aria-hidden="true">→</span></Link></section>
    <footer className="tic-footer"><Link href="/developers" className="tic-brand"><Image src="/tidelight-mark.svg" alt="" width={23} height={23}/><span className="tic-brand-name">Tidelight</span><span>Intelligence Cloud</span></Link><span>Source-aware intelligence infrastructure</span><div><Link href="https://dev.tidelight.app">Documentation</Link><Link href="/developers/console">Console</Link></div></footer>
  </main>;
}
