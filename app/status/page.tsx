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
  const services = status.groups.flatMap(group => group.services);
  const checkedCount = services.filter(service => service.state !== "monitoring").length;
  const monitoringCount = services.length - checkedCount;
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
        <div><p className="tic-status-eyebrow">TIDELIGHT ECOSYSTEM</p>
          <h1 id="status-title">Service status</h1>
          <p>Availability checks for Tidelight products, research services, and developer packages.</p>
        </div>
        <div className={`tic-status-signal ${status.status}`} aria-label={`${checkedCount} current checks, ${monitoringCount} background services not monitored`}>
          <svg viewBox="0 0 340 120" preserveAspectRatio="none" aria-hidden="true"><path className="tic-status-signal-grid" d="M0 30H340M0 60H340M0 90H340M68 0V120M136 0V120M204 0V120M272 0V120"/><path className="tic-status-signal-wave" d="M0 76c34 0 38-32 70-32s36 45 70 45 35-50 70-50 35 38 68 38 34-24 62-24"/><path className="tic-status-signal-wave-secondary" d="M0 78c38 0 37-9 70-9s38 18 70 18 36-21 70-21 34 13 68 13 37-10 62-10"/><circle cx="209" cy="39" r="4"/></svg>
          <div className="tic-status-signal-caption"><span><i />LIVE CHECKS</span><strong>{checkedCount} <small>monitored</small></strong><em>{monitoringCount} background services are not monitored here</em></div>
        </div>
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
              </div>)}
            </div>
          </details>;
        })}
      </div>
      <p className="tic-status-updated">Checked {checked}. <a href="/health">Health data ↗</a></p>
      <aside className="tic-status-history-note">
        <strong>What these checks cover</strong>
        <p>Site, API, registry, and database checks run as this page loads. Background job execution and message delivery are not monitored here, so they are shown separately as not monitored.</p>
      </aside>
    </section>
    <footer className="tic-status-footer"><span>One status page for the Tidelight ecosystem</span><a href="https://tidelight.app/developers">Developer platform ↗</a></footer>
  </main>;
}
