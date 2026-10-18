import Link from "next/link";
import type { Metadata } from "next";
import { PlatformNav } from "../../platform-nav";
import { packageCatalog } from "../catalog.generated";
import { PackageWorkbench } from "../package-workbench";
import { PackageRegistryCard } from "../registry-facts";
import "../../tidelight-developers.css";
import "../../platform-polish.css";
import "../packages.css";
import "../registry-live.css";
import "./dashboard.css";

export const metadata: Metadata = {
  title: { absolute: "Package dashboard — Tidelight Packages" },
  description: "Browse official Tidelight packages, verified registry releases, install commands, and working examples.",
  alternates: { canonical: "https://package.tidelight.app/dashboard" },
};

export default function PackageDashboardPage() {
  return <main className="tic tic-landing tic-packages-page tic-package-dashboard">
    <PlatformNav active="packages" />
    <section className="tic-package-dashboard-heading">
      <div><p className="tic-eyebrow"><span className="tic-status-dot"/> PACKAGES / WORKSPACE</p><h1>Your package<br/><em>dashboard.</em></h1><p>Find the right integration, inspect the published release, and start with a verified install command.</p></div>
      <div className="tic-package-dashboard-summary"><span className="tic-package-dashboard-live"><i/> Registry status</span><strong>Five official integrations</strong><p>npm · PyPI · GitHub Container Registry</p><Link href="https://package.tidelight.app">Back to Packages home <span aria-hidden="true">↗</span></Link></div>
    </section>
    <PackageWorkbench />
    <section className="tic-package-directory tic-package-dashboard-directory" aria-labelledby="package-directory-title">
      <div className="tic-package-section-head"><div><p className="tic-eyebrow">YOUR INTEGRATION CATALOG / 05</p><h2 id="package-directory-title">Choose your entry point</h2><p>Each package page includes its registry source, compatibility notes, and an implementation guide.</p></div><span className="tic-package-live-label"><i/> npm · PyPI</span></div>
      <div className="tic-package-grid">{packageCatalog.map((item, index) => <PackageRegistryCard key={item.id} packageId={item.id} name={item.display.name} summary={item.display.summary} href={item.display.href} glyph={item.display.glyph} ecosystem={item.display.ecosystem} index={index} />)}</div>
    </section>
    <section className="tic-package-dashboard-help"><div><p className="tic-eyebrow">NEED THE FULL PLATFORM?</p><h2>Build with Tidelight Intelligence Cloud.</h2><p>Use one account for your projects, API keys, usage, and research jobs.</p></div><Link className="tic-button tic-primary" href="https://tidelight.app/developers">Visit Intelligence Cloud <span aria-hidden="true">→</span></Link></section>
    <footer className="tic-footer"><Link href="https://package.tidelight.app" className="tic-brand"><strong className="tic-brand-name">Tidelight</strong><span>Packages</span></Link><span>Official packages · one connected ecosystem</span><div><Link href="https://package.tidelight.app">Packages home</Link><Link href="https://tidelight.app/developers">Intelligence Cloud</Link><Link href="https://tidelight.app/">Tidelight</Link><Link href="https://github.com/TidelightOrg/tidelight" target="_blank" rel="noreferrer">GitHub ↗</Link></div></footer>
  </main>;
}
