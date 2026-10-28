import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { getStatusHistory } from "@/lib/tic/system-status";
import { getCompletedMaintenanceHistory } from "@/lib/tic/editorial-content";
import type { MaintenanceNotice } from "@/lib/tic/editorial-content";
import { resolveStatusPagePath } from "@/lib/tic/status-links";
import "../status.css";
import { StatusActions } from "../status-actions";

export const metadata: Metadata = {
  title: "History · Tidelight status",
  description: "A chronological archive of recorded service incidents and resolved maintenance for Tidelight.",
};

const componentNames: Record<string, string> = {
  "Tidelight app": "Websites",
  "Developer docs": "Websites",
  "Package directory": "Websites",
  "REST API": "APIs",
  "Research job API": "APIs",
  "MCP server metadata": "APIs",
  "npm registry": "Package registries",
  "Python package registry": "Package registries",
  "Application database": "Data",
  "Research job processing": "Background services",
  "Scheduled paper analysis": "Background services",
  "Webhook delivery": "Background services",
  "Email delivery": "Background services",
};

function monthStart(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1));
}
function monthKey(date: Date) {
  return date.toISOString().slice(0, 7);
}
function monthLabel(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(date);
}
function dayLabel(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(date);
}
function timeLabel(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone: "UTC", timeZoneName: "short" }).format(new Date(value));
}
function dateTimeLabel(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC", timeZoneName: "short" }).format(new Date(value));
}

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ month?: string; component?: string }> }) {
  const [host, history, params] = await Promise.all([headers().then(value => value.get("host")), getStatusHistory(), searchParams]);
  const statusPath = resolveStatusPagePath(host, "/status");
  const historyPath = resolveStatusPagePath(host, "/status/history");
  const selectedMonth = /^\d{4}-\d{2}$/.test(params.month ?? "") ? monthStart(params.month!) : monthStart(monthKey(new Date()));
  const selectedKey = monthKey(selectedMonth);
  const previousMonth = new Date(Date.UTC(selectedMonth.getUTCFullYear(), selectedMonth.getUTCMonth() - 1, 1));
  const nextMonth = new Date(Date.UTC(selectedMonth.getUTCFullYear(), selectedMonth.getUTCMonth() + 1, 1));
  const monthAfterSelected = new Date(Date.UTC(selectedMonth.getUTCFullYear(), selectedMonth.getUTCMonth() + 1, 1));
  const currentKey = monthKey(new Date());
  const locale = "en-US";
  let completedMaintenance: MaintenanceNotice[] = [];
  let maintenanceAvailable = true;
  try {
    completedMaintenance = await getCompletedMaintenanceHistory(selectedMonth.toISOString(), monthAfterSelected.toISOString());
  } catch {
    maintenanceAvailable = false;
  }
  const components = [...new Set([
    ...history.incidents.map(incident => componentNames[incident.component] ?? incident.component),
    ...(completedMaintenance.length ? ["Maintenance"] : []),
  ])].sort();
  const filteredIncidents = history.incidents
    .filter(incident => monthKey(new Date(incident.startedAt)) === selectedKey)
    .filter(incident => !params.component || params.component === "all" || (componentNames[incident.component] ?? incident.component) === params.component)
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  const filteredMaintenance = completedMaintenance
    .filter(notice => !params.component || params.component === "all" || params.component === "Maintenance")
    .sort((a, b) => Date.parse(b.ends_at ?? b.starts_at) - Date.parse(a.ends_at ?? a.starts_at));
  const grouped = new Map<string, typeof filteredIncidents>();
  for (const incident of filteredIncidents) {
    const key = new Date(incident.startedAt).toISOString().slice(0, 10);
    grouped.set(key, [...(grouped.get(key) ?? []), incident]);
  }
  const maintenanceByDay = new Map<string, MaintenanceNotice[]>();
  for (const notice of filteredMaintenance) {
    const key = new Date(notice.ends_at ?? notice.starts_at).toISOString().slice(0, 10);
    maintenanceByDay.set(key, [...(maintenanceByDay.get(key) ?? []), notice]);
  }
  const days = [...new Set([...grouped.keys(), ...maintenanceByDay.keys()])].sort((a, b) => b.localeCompare(a));
  return <main className="tic-status-page">
    <header className="tic-status-header">
      <a className="tic-status-wordmark" href="https://tidelight.app" aria-label="Tidelight home">tide<span>light</span></a>
      <nav aria-label="Status navigation">
        <Link href={statusPath}>Status</Link>
        <Link href={resolveStatusPagePath(host, "/status/maintenance")}>Maintenance</Link>
        <Link aria-current="page" href={historyPath}>History</Link>
        <a href="https://tidelight.app/contact">Get in touch</a>
      </nav>
      <StatusActions />
    </header>
    <section className="tic-status-history-page" aria-labelledby="history-title">
      <p className="tic-status-breadcrumb"><Link href={statusPath}>Tidelight</Link><span>/</span><span>History</span></p>
      <div className="tic-status-history-toolbar">
        <h1 id="history-title">History</h1>
        <div className="tic-status-period">
          <Link aria-label="Previous month" href={historyPath + "?month=" + monthKey(previousMonth) + (params.component ? "&component=" + encodeURIComponent(params.component) : "")}>‹</Link>
          <span>{monthLabel(previousMonth, locale)} {previousMonth.getUTCFullYear()} – {monthLabel(selectedMonth, locale)} {selectedMonth.getUTCFullYear()}</span>
          <Link aria-label="Next month" aria-disabled={selectedKey >= currentKey} href={historyPath + "?month=" + monthKey(nextMonth) + (params.component ? "&component=" + encodeURIComponent(params.component) : "")}>›</Link>
        </div>
        <details className="tic-status-filter">
          <summary>Filter components <span aria-hidden="true">⌄</span></summary>
          <form method="get" action={historyPath} className="tic-status-filter-panel">
            <input type="hidden" name="month" value={selectedKey} />
            <label><input type="radio" name="component" value="all" defaultChecked={!params.component || params.component === "all"} />All components</label>
            {components.map(component => <label key={component}><input type="radio" name="component" value={component} defaultChecked={params.component === component} />{component}</label>)}
            <button type="submit">Apply filter</button>
          </form>
        </details>
      </div>
      {!history.available ? <div className="tic-status-history-empty"><strong>Incident history is temporarily unavailable</strong>The incident archive could not be loaded. Current live checks remain available on the status page.</div> : null}
      {!maintenanceAvailable ? <div className="tic-status-history-empty"><strong>Maintenance history is temporarily unavailable</strong>Service incident history remains available on this page.</div> : null}
      {days.length === 0
        ? history.available && maintenanceAvailable
          ? <div className="tic-status-history-empty"><strong>No recorded incidents or resolved maintenance for {monthLabel(selectedMonth, locale)}</strong>Only events recorded by Tidelight appear here. Earlier periods may not have records.</div>
          : null
        : <div>{days.map(key => {
              const day = new Date(key + "T00:00:00Z");
              const incidents = grouped.get(key) ?? [];
              const notices = maintenanceByDay.get(key) ?? [];
              const events = [
                ...incidents.map(incident => ({ at: incident.startedAt, kind: "incident" as const, value: incident })),
                ...notices.map(notice => ({ at: notice.ends_at ?? notice.starts_at, kind: "maintenance" as const, value: notice })),
              ].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
              return <section className="tic-status-history-month" key={key} aria-label={monthLabel(day, locale)}>
                <h2>{monthLabel(day, locale)}</h2>
                <div className="tic-status-history-day">
                  <div className="tic-status-history-date"><strong>{day.getUTCDate()}</strong><small>{dayLabel(day, locale)}</small></div>
                  <div className="tic-status-history-events">
                    {events.map(event => event.kind === "incident"
                      ? <article className={"tic-status-history-event " + (event.value.state === "investigating" ? "degraded" : "resolved")} key={"incident-" + event.value.id}>
                          <div className="tic-status-history-event-copy">
                            <Link href={resolveStatusPagePath(host, "/status/incidents") + "#" + event.value.id}>{event.value.component}</Link>
                            <p>{event.value.detail}</p>
                          </div>
                          <time dateTime={event.value.startedAt}>{timeLabel(event.value.startedAt, locale)}</time>
                        </article>
                      : <article className="tic-status-history-event resolved" key={"maintenance-" + event.value.id}>
                          <div className="tic-status-history-event-copy">
                            <strong>Maintenance · {event.value.title}</strong>
                            <p>{event.value.subtitle}</p>
                            <p>{event.value.message}</p>
                            <small>Started <time dateTime={event.value.starts_at}>{dateTimeLabel(event.value.starts_at, locale)}</time> · Resolved <time dateTime={event.value.ends_at ?? ""}>{event.value.ends_at ? dateTimeLabel(event.value.ends_at, locale) : "Time unavailable"}</time></small>
                          </div>
                          {event.value.ends_at ? <time dateTime={event.value.ends_at}>{timeLabel(event.value.ends_at, locale)}</time> : null}
                        </article>)}
                  </div>
                </div>
              </section>;
            })}</div>)}
    </section>
    <footer className="tic-status-footer"><span>One status page for the Tidelight ecosystem</span><Link href={statusPath}>Current status ↗</Link></footer>
  </main>;
}
