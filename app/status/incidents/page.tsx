import type { Metadata } from "next";
import Link from "next/link";
import "../status.css";

export const metadata: Metadata = { title: "Incidents · Tidelight status", description: "Published incident updates for Tidelight services." };

export default function IncidentsPage() {
  return <main className="tic-status-page">
    <header className="tic-status-header">
      <a className="tic-status-wordmark" href="https://tidelight.app" aria-label="Tidelight home">tide<span>light</span></a>
      <nav aria-label="Status navigation"><Link href="/">Status</Link><Link href="/maintenance">Maintenance</Link><Link aria-current="page" href="/incidents">Previous incidents</Link><a href="https://tidelight.app/support">Get in touch</a></nav>
    </header>
    <section className="tic-status-empty-page" aria-labelledby="incidents-title">
      <p className="tic-status-eyebrow">TIDELIGHT STATUS</p>
      <h1 id="incidents-title">Incident history</h1>
      <p>Incident updates will be published here when the Tidelight team records an event affecting a service.</p>
      <div className="tic-status-empty-card"><strong>Incident archive not connected</strong><p>This page does not yet have a durable incident record system. It cannot confirm whether an unrecorded issue occurred.</p></div>
      <Link href="/">← Back to current status</Link>
    </section>
    <footer className="tic-status-footer"><span>One status page for the Tidelight ecosystem</span><a href="https://tidelight.app/developers">Developer platform ↗</a></footer>
  </main>;
}
