import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { getStatusHistory } from "@/lib/tic/system-status";
import { resolveStatusPagePath } from "@/lib/tic/status-links";
import "../status.css";

export const metadata: Metadata = {
  title: "History · Tidelight status",
  description: "A chronological archive of recorded service incidents for Tidelight.",
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

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ month?: string; component?: string }> }) {
  const [host, history, params] = await Promise.all([headers().then(value => value.get("host")), getStatusHistory(), searchParams]);
  const statusPath = resolveStatusPagePath(host, "/status");
  const historyPath = resolveStatusPagePath(host, "/status/history");
  const selectedMonth = /^\d{4}-\d{2}$/.test(params.month ?? "") ? monthStart(params.month!) : monthStart(monthKey(new Date()));
  const selectedKey = monthKey(selectedMonth);
  const previousMonth = new Date(Date.UTC(selectedMonth.getUTCFullYear(), selectedMonth.getUTCMonth() - 1, 1));
  const nextMonth = new Date(Date.UTC(selectedMonth.getUTCFullYear(), selectedMonth.getUTCMonth() + 1, 1));
  const currentKey = monthKey(new Date());
  const locale = "en-US";
  const components = [...new Set(history.incidents.map(incident => componentNames[incident.component] ?? incident.component))].sort();
  const filteredIncidents = history.incidents
    .filter(incident => monthKey(new Date(incident.startedAt)) === selectedKey)
    .filter(incident => !params.component || params.component === "all" || (componentNames[incident.component] ?? incident.component) === params.component)
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  const grouped = new Map<string, typeof filteredIncidents>();
  for (const incident of filteredIncidents) {
    const key = new Date(incident.startedAt).toISOString().slice(0, 10);
    grouped.set(key, [...(grouped.get(key) ?? []), incident]);
  }
  return <main className="tic-status-page">
    <header className="tic-status-header">
      <a className="tic-status-wordmark" href="https://tidelight.app" aria-label="Tidelight home">tide<span>light</span></a>
      <nav aria-label="Status navigation">
        <Link href={statusPath}>Status</Link>
        <Link href={resolveStatusPagePath(host, "/status/maintenance")}>Maintenance</Link>
        <Link aria-current="page" href={historyPath}>History</Link>
        <a href="https://tidelight.app/contact">Get in touch</a>
      </nav>
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
      {!history.available ? <div className="tic-status-history-empty"><strong>History is temporarily unavailable</strong>The incident archive could not be loaded. Current live checks remain available on the status page.</div>
        : filteredIncidents.length === 0 ? <div className="tic-status-history-empty"><strong>No recorded incidents for {monthLabel(selectedMonth, locale)}</strong>Only incidents detected and recorded by Tidelight appear here. Earlier periods may not have records.</div>
          : <div>{[...grouped.entries()].map(([key, incidents]) => {
            const day = new Date(key + "T00:00:00Z");
            return <section className="tic-status-history-month" key={key} aria-label={monthLabel(day, locale)}>
              <h2>{monthLabel(day, locale)}</h2>
              <div className="tic-status-history-day">
                <div className="tic-status-history-date"><strong>{day.getUTCDate()}</strong><small>{dayLabel(day, locale)}</small></div>
                <div className="tic-status-history-events">
                  {incidents.map(incident => <article className={"tic-status-history-event " + (incident.state === "investigating" ? "degraded" : "resolved")} key={incident.id}>
                    <div className="tic-status-history-event-copy">
                      <Link href={resolveStatusPagePath(host, "/status/incidents") + "#" + incident.id}>{incident.component}</Link>
                      <p>{incident.detail}</p>
                    </div>
                    <time dateTime={incident.startedAt}>{timeLabel(incident.startedAt, locale)}</time>
                  </article>)}
                </div>
              </div>
            </section>;
          })}</div>}
    </section>
    <footer className="tic-status-footer"><span>One status page for the Tidelight ecosystem</span><Link href={statusPath}>Current status ↗</Link></footer>
  </main>;
}
