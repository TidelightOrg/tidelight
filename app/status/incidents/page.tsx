import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { getStatusHistory } from "@/lib/tic/system-status";
import { resolveStatusPagePath } from "@/lib/tic/status-links";
import "../status.css";
import { StatusActions } from "../status-actions";

export const metadata: Metadata = { title: "Incidents · Tidelight status", description: "Published incident updates for Tidelight services." };

export default async function IncidentsPage() {
  const [host, history] = await Promise.all([headers().then(value => value.get("host")), getStatusHistory()]);
  const statusPath = resolveStatusPagePath(host, "/status");
  const maintenancePath = resolveStatusPagePath(host, "/status/maintenance");
  const incidentsPath = resolveStatusPagePath(host, "/status/incidents");
  return <main className="tic-status-page">
    <header className="tic-status-header">
      <a className="tic-status-wordmark" href="https://tidelight.app" aria-label="Tidelight home">tide<span>light</span></a>
      <nav aria-label="Status navigation"><Link href={statusPath}>Status</Link><Link href={maintenancePath}>Maintenance</Link><Link aria-current="page" href={incidentsPath}>Incidents</Link><a href="https://tidelight.app/contact">Get in touch</a></nav>
      <StatusActions />
    </header>
    <section className="tic-status-empty-page" aria-labelledby="incidents-title">
      <p className="tic-status-eyebrow">TIDELIGHT STATUS</p>
      <h1 id="incidents-title">Incident history</h1>
      <p>Scheduled availability checks record service changes for up to 90 days.</p>
      {!history.available ? <div className="tic-status-empty-card"><strong>Incident history is temporarily unavailable</strong><p>We could not load the status archive. Current live checks remain available on the status page.</p></div>
        : history.incidents.length === 0 ? <div className="tic-status-empty-card"><strong>No recorded incidents in the available history</strong><p>Incident records begin when scheduled status history is enabled. Earlier periods may not have records.</p></div>
          : <ol className="tic-status-incident-list">{history.incidents.map(incident => <li className="tic-status-incident" key={incident.id} id={String(incident.id)}>
            <div className="tic-status-incident-top"><strong>{incident.component}</strong><span className={incident.state}>{incident.state === "resolved" ? "Resolved" : "Investigating"}</span></div>
            <p>{incident.detail}</p>
            <time dateTime={incident.startedAt}>{new Date(incident.startedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC", timeZoneName: "short" })}</time>
            {incident.resolvedAt && <small>Resolved {new Date(incident.resolvedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC", timeZoneName: "short" })}</small>}
          </li>)}</ol>}
      <Link href={statusPath}>← Back to current status</Link>
    </section>
    <footer className="tic-status-footer"><span>One status page for the Tidelight ecosystem</span><a href="https://tidelight.app/developers">Developer platform ↗</a></footer>
  </main>;
}
