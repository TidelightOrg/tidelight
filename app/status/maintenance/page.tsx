import type { Metadata } from "next";
import Link from "next/link";
import "../status.css";

export const metadata: Metadata = { title: "Maintenance · Tidelight status", description: "Scheduled maintenance notices for Tidelight services." };

export default function MaintenancePage() {
  return <main className="tic-status-page">
    <header className="tic-status-header">
      <a className="tic-status-wordmark" href="https://tidelight.app" aria-label="Tidelight home">tide<span>light</span></a>
      <nav aria-label="Status navigation"><Link href="/">Status</Link><Link aria-current="page" href="/maintenance">Maintenance</Link><Link href="/incidents">Previous incidents</Link><a href="https://tidelight.app/support">Get in touch</a></nav>
    </header>
    <section className="tic-status-empty-page" aria-labelledby="maintenance-title">
      <p className="tic-status-eyebrow">TIDELIGHT STATUS</p>
      <h1 id="maintenance-title">Scheduled maintenance</h1>
      <p>Planned maintenance notices will appear here with the affected services, expected timing, and updates.</p>
      <div className="tic-status-empty-card"><strong>Maintenance notices are not yet managed here</strong><p>This page has no connected maintenance calendar. Check current service checks for live availability.</p></div>
      <Link href="/">← Back to current status</Link>
    </section>
    <footer className="tic-status-footer"><span>One status page for the Tidelight ecosystem</span><a href="https://tidelight.app/developers">Developer platform ↗</a></footer>
  </main>;
}
