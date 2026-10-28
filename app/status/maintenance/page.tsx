import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { resolveStatusPagePath } from "@/lib/tic/status-links";
import { getMaintenanceNotices } from "@/lib/tic/editorial-content";
import type { MaintenanceNotice } from "@/lib/tic/editorial-content";
import "../status.css";
import { StatusActions } from "../status-actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Maintenance · Tidelight status", description: "Scheduled maintenance notices for Tidelight services." };

function formatStatusTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", timeZone: "UTC", timeZoneName: "short",
  }).format(new Date(value));
}

function noticeLabel(notice: MaintenanceNotice) {
  if (notice.status === "completed") return "Resolved";
  if (notice.status === "ongoing") return "In progress";
  return "Scheduled";
}

export default async function MaintenancePage() {
  const host = (await headers()).get("host");
  const statusPath = resolveStatusPagePath(host, "/status");
  const maintenancePath = resolveStatusPagePath(host, "/status/maintenance");
  const incidentsPath = resolveStatusPagePath(host, "/status/incidents");
  let notices: MaintenanceNotice[] = [];
  let unavailable = false;
  try { notices = await getMaintenanceNotices(); } catch { unavailable = true; }
  const currentNotices = notices.filter(item => item.status === "ongoing" || item.status === "scheduled");
  const resolutionCutoff = Date.now() - 24 * 60 * 60 * 1000;
  const pastNotices = notices.filter(item => item.status === "completed" && item.ends_at !== null && Date.parse(item.ends_at) >= resolutionCutoff);

  return <main className="tic-status-page">
    <header className="tic-status-header">
      <a className="tic-status-wordmark" href="https://tidelight.app" aria-label="Tidelight home">tide<span>light</span></a>
      <nav aria-label="Status navigation"><Link href={statusPath}>Status</Link><Link aria-current="page" href={maintenancePath}>Maintenance</Link><Link href={incidentsPath}>Previous incidents</Link><a href="https://tidelight.app/contact">Get in touch</a></nav>
      <StatusActions />
    </header>
    <section className="tic-status-empty-page tic-status-maintenance-page" aria-labelledby="maintenance-title">
      <p className="tic-status-eyebrow">TIDELIGHT STATUS</p>
      <h1 id="maintenance-title">Maintenance</h1>
      <p>Planned work and service updates across the Tidelight ecosystem.</p>
      {unavailable ? <div className="tic-status-empty-card"><strong>Maintenance updates are temporarily unavailable</strong><p>Please check the live service status while we restore the notice feed.</p></div> : currentNotices.length ? <div className="tic-status-maintenance-list">{currentNotices.map(notice => <article className={`tic-status-maintenance-card ${notice.status}`} key={notice.id}>
        <div className="tic-status-maintenance-heading"><div><span className="tic-status-eyebrow">{noticeLabel(notice)}</span><h2>{notice.title}</h2></div><span className={`tic-status-state ${notice.status === "ongoing" ? "degraded" : "monitoring"}`}><i />{noticeLabel(notice)}</span></div>
        <p className="tic-status-maintenance-subtitle">{notice.subtitle}</p><p className="tic-status-maintenance-message">{notice.message}</p>
        <div className="tic-status-maintenance-meta"><span>Started <time dateTime={notice.starts_at}>{formatStatusTime(notice.starts_at)}</time></span>{notice.ends_at ? <span>{notice.status === "completed" ? "Resolved" : "Expected completion"} <time dateTime={notice.ends_at}>{formatStatusTime(notice.ends_at)}</time></span> : null}</div>
        {notice.affected_services.length ? <div className="tic-status-maintenance-services"><strong>Affected services</strong><ul>{notice.affected_services.map(service => <li key={service}>{service}</li>)}</ul></div> : null}
      </article>)}</div> : <div className="tic-status-empty-card"><strong>No scheduled maintenance</strong><p>There are no active or upcoming maintenance notices at this time.</p></div>}
      {pastNotices.length ? <section className="tic-status-maintenance-past"><h2>Past maintenance</h2><div className="tic-status-maintenance-list">{pastNotices.map(notice => <article className="tic-status-maintenance-card completed" key={notice.id}><div className="tic-status-maintenance-heading"><div><span className="tic-status-eyebrow">{noticeLabel(notice)}</span><h2>{notice.title}</h2></div><span className="tic-status-state operational"><i />Resolved</span></div><p className="tic-status-maintenance-subtitle">{notice.subtitle}</p><p className="tic-status-maintenance-message">{notice.message}</p><div className="tic-status-maintenance-meta"><span>Started <time dateTime={notice.starts_at}>{formatStatusTime(notice.starts_at)}</time></span>{notice.ends_at ? <span>Completed <time dateTime={notice.ends_at}>{formatStatusTime(notice.ends_at)}</time></span> : null}</div></article>)}</div></section> : null}
      <Link href={statusPath}>← Back to current status</Link>
    </section>
    <footer className="tic-status-footer"><span>One status page for the Tidelight ecosystem</span><a href="https://tidelight.app/developers">Developer platform ↗</a></footer>
  </main>;
}
