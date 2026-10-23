import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { PlatformNav } from "../platform-nav";
import { packageCatalog } from "./catalog.generated";
import { PackageRegistryCard } from "./registry-facts";
import { PackageOrbit3D } from "./package-orbit-3d";
import "../tidelight-developers.css";
import "../platform-polish.css";
import "./packages.css";
import "./registry-live.css";
import "./dashboard/dashboard.css";

export const metadata: Metadata = {
  title: { absolute: "Tidelight Packages — Official integrations" },
  description: "Explore Tidelight's official developer packages, their current release status, and source-backed installation guidance.",
  alternates: { canonical: "https://package.tidelight.app" },
};



export default function DeveloperPackagesPage() {
  return <main className="tic tic-landing tic-packages-page">
    <PlatformNav active="packages" packageHome />
    <header className="tic-packages-hero">
      <div><p className="tic-eyebrow"><span className="tic-status-dot"/> OFFICIAL DEVELOPER PACKAGES</p><h1>Tidelight packages<br/><em>for your stack.</em></h1><p>Official packages for TypeScript, React, Python, MCP, and the CLI, with current releases and install guidance from their registries.</p>
        <div className="tic-package-hero-actions"><Link className="tic-button tic-primary" href="https://package.tidelight.app/dashboard">Open package dashboard <span aria-hidden="true">→</span></Link><Link className="tic-button" href="#package-directory-title">Browse packages <span aria-hidden="true">↓</span></Link></div>
      </div>
      <div className="tic-package-constellation" role="img" aria-label="Tidelight's shared API connects the SDK, MCP, Python, React, and CLI packages. ">
        <PackageOrbit3D />
        <div className="tic-package-orbit tic-orbit-one"/><div className="tic-package-orbit tic-orbit-two"/><div className="tic-package-core"><span>ONE CORE</span><strong>TIDELIGHT</strong><small>API · AUTH · CONTRACTS</small></div>
        <span className="tic-package-node node-sdk">SDK</span><span className="tic-package-node node-mcp">MCP</span><span className="tic-package-node node-python">PYTHON</span><span className="tic-package-node node-react">REACT</span><span className="tic-package-node node-cli">CLI</span>
        <span className="tic-package-connector connector-a"/><span className="tic-package-connector connector-b"/><span className="tic-package-connector connector-c"/><span className="tic-package-connector connector-d"/><span className="tic-package-connector connector-e"/>
      </div>
    </header>
    <section className="tic-package-directory" aria-labelledby="package-directory-title">
      <div className="tic-package-section-head"><div><p className="tic-eyebrow">PACKAGES</p><h2 id="package-directory-title">Available packages</h2><p>Install commands, release history, and canonical source for each package.</p></div><span className="tic-package-live-label"><i/> CURRENT RELEASES</span></div>
      <div className="tic-package-grid">{packageCatalog.map((item, index) => <PackageRegistryCard key={item.id} packageId={item.id} name={item.display.name} summary={item.display.summary} href={item.display.href} ecosystem={item.display.ecosystem} index={index} />)}</div>
    </section>
    <section className="tic-package-policy"><div><p className="tic-eyebrow">TRUST BEFORE INSTALL</p><h2>Release status stays visible.</h2></div><p>Each package links to its registry and canonical source.</p><Link href="https://dev.tidelight.app#sdks">Read the developer guides <span aria-hidden="true">→</span></Link></section>
    <footer className="tic-footer"><Link href="https://package.tidelight.app" className="tic-brand"><Image src="/tidelight-mark.svg" alt="" width={23} height={23}/><span className="tic-brand-name">Tidelight</span><span>Packages</span></Link><div><Link href="https://dev.tidelight.app">Documentation</Link><Link href="https://tidelight.app/developers/console">Developer console</Link><Link href="https://package.tidelight.app/dashboard">Package dashboard</Link><Link href="https://github.com/TidelightOrg/tidelight" target="_blank" rel="noreferrer">GitHub ↗</Link><Link href="https://x.com/TidelightOrg" target="_blank" rel="noreferrer">X ↗</Link></div></footer>
  </main>;
}
