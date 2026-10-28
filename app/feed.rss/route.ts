import { getStatusHistory } from "@/lib/tic/system-status";
import { resolveStatusPagePath } from "@/lib/tic/status-links";
export const dynamic = "force-dynamic";
const xml = (value: string) => value.replace(/[<>&'"]/g, c => ({ "<":"&lt;",">":"&gt;","&":"&amp;","'":"&apos;",'"':"&quot;" })[c]!);
export async function GET(request: Request) {
  const history = await getStatusHistory();
  if (!history.available) return new Response("Status history is temporarily unavailable.", { status: 503, headers: { "Cache-Control": "no-store" } });
  const url = new URL(request.url);
  const base = url.origin;
  const incidentsPath = resolveStatusPagePath(url.host, "/status/incidents");
  const items = history.incidents.flatMap(incident => {
    const link = base + incidentsPath + "#" + incident.id;
    const start = `<item><title>${xml(incident.component)} — Incident reported</title><description>${xml(incident.detail)}</description><link>${xml(link)}</link><guid isPermaLink="false">urn:tidelight:status:${incident.id}:new</guid><pubDate>${new Date(incident.startedAt).toUTCString()}</pubDate></item>`;
    const resolution = incident.resolvedAt ? `<item><title>${xml(incident.component)} — Service restored</title><description>${xml(incident.detail)}</description><link>${xml(link)}</link><guid isPermaLink="false">urn:tidelight:status:${incident.id}:resolved</guid><pubDate>${new Date(incident.resolvedAt).toUTCString()}</pubDate></item>` : "";
    return [start, ...(resolution ? [resolution] : [])];
  }).join("");
  const body = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Tidelight status updates</title><link>${xml(base)}</link><description>Recorded incidents and service updates for Tidelight.</description><lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items}</channel></rss>`;
  return new Response(body, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=300, stale-while-revalidate=900" } });
}
