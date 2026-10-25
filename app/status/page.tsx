import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { getSystemStatus } from "@/lib/tic/system-status";
import { resolveStatusPagePath } from "@/lib/tic/status-links";
import "./status.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Tidelight status",
  description: "Live status for Tidelight products, developer services, APIs, and package registries.",
};

export default async function StatusPage() {
  const [status, requestHeaders] = await Promise.all([getSystemStatus(), headers()]);
  const statusPath = resolveStatusPagePath(requestHeaders.get("host"), "/status");
  const maintenancePath = resolveStatusPagePath(requestHeaders.get("host"), "/status/maintenance");
  const incidentsPath = resolveStatusPagePath(requestHeaders.get("host"), "/status/incidents");
  const label = status.status === "operational" ? "All monitored services operational" : "A service is experiencing issues";
  const checked = new Date(status.checkedAt).toLocaleString("en", { timeZone: "UTC", timeZoneName: "short" });
  return <main className="tic-status-page">
    <header className="tic-status-header">
      <a className="tic-status-wordmark" href="https://tidelight.app" aria-label="Tidelight home">tide<span>light</span></a>
      <nav aria-label="Status navigation">
        <Link aria-current="page" href={statusPath}>Status</Link>
        <Link href={maintenancePath}>Maintenance</Link>
        <Link href={incidentsPath}>Previous incidents</Link>
        <a href="https://tidelight.app/support">Get in touch</a>
      </nav>
    </header>
    <div className={`tic-status-summary ${status.status}`} role="status">
      <span className="tic-status-summary-icon" aria-hidden="true">{status.status === "operational" ? "✓" : "!"}</span>
      <strong>{label}</strong>
    </div>
    <section className="tic-status-content" aria-labelledby="status-title">
      <div className="tic-status-page-heading">
        <p className="tic-status-eyebrow">TIDELIGHT ECOSYSTEM</p>
        <h1 id="status-title">Service status</h1>
        <p>Availability checks for Tidelight products, research services, and developer packages.</p>
      </div>
      <div className="tic-status-groups" aria-label="Tidelight services">
        {status.groups.map(group => {
          const groupState = group.services.some(service => service.state === "degraded") ? "degraded"
            : group.services.every(service => service.state === "monitoring") ? "monitoring" : "operational";
          const stateLabel = groupState === "monitoring" ? "Not monitored" : groupState === "degraded" ? "Degraded" : "Operational";
          return <details className="tic-status-group" key={group.name} open={group.name === "Websites"}>
            <summary>
              <span className="tic-status-group-title"><span className="tic-status-chevron" aria-hidden="true">›</span>{group.name}</span>
              <span className={`tic-status-state ${groupState}`}><i aria-hidden="true" />{stateLabel}</span>
            </summary>
            <div className="tic-status-group-services">
              {group.services.map(service => <div className="tic-status-service" key={service.name}>
                <div className="tic-status-service-current">
                  <div className="tic-status-service-name">
                    {service.href ? <a href={service.href}>{service.name}<span aria-hidden="true"> ↗</span></a> : <span>{service.name}</span>}
                    <small>{service.detail}</small>
                  </div>
                  <span className={`tic-status-state ${service.state}`}><i aria-hidden="true" />{service.state === "monitoring" ? "Not monitored" : service.state === "operational" ? "Operational" : "Degraded"}</span>
                </div>
                <p className="tic-status-service-history">History not yet available<span>Scheduled measurements have not been collected.</span></p>
              </div>)}
            </div>
          </details>;
        })}
      </div>
      <p className="tic-status-updated">Checked {checked}. <a href="/health">Health data ↗</a></p>
      <aside className="tic-status-history-note">
        <strong>Availability history</strong>
        <p>Live checks run when this page is requested. Historical uptime bars and incident timelines will appear after scheduled monitoring is in place. Background job execution and delivery are not probed by this page.</p>
      </aside>
    </section>
    <footer className="tic-status-footer"><span>One status page for the Tidelight ecosystem</span><a href="https://tidelight.app/developers">Developer platform ↗</a></footer>
  </main>;
}
