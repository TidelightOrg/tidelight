import { getStatusFeedEvents } from "@/lib/tic/system-status";
import { resolveStatusPagePath } from "@/lib/tic/status-links";
export const dynamic = "force-dynamic";
const xml = (value: string) => value.replace(/[<>&'"]/g, c => ({ "<":"&lt;",">":"&gt;","&":"&amp;","'":"&apos;",'"':"&quot;" })[c]!);
export async function GET(request: Request) {
  const history = await getStatusFeedEvents();
  if (!history.available) return new Response("Status history is temporarily unavailable.", { status: 503, headers: { "Cache-Control": "no-store" } });
  const url = new URL(request.url);
  const base = url.origin;
  const incidentsPath = resolveStatusPagePath(url.host, "/status/incidents");
  const items = history.events.map(event => {
    const link = base + incidentsPath + "#" + event.id;
    const title = event.kind === "new" ? "Incident reported" : "Service restored";
    return `<item><title>${xml(event.component)} — ${title}</title><description>${xml(event.detail)}</description><link>${xml(link)}</link><guid isPermaLink="false">urn:tidelight:status:${event.id}:${event.kind}</guid><pubDate>${new Date(event.occurredAt).toUTCString()}</pubDate></item>`;
  }).join("");
  const body = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Tidelight status updates</title><link>${xml(base)}</link><description>Recorded incidents and service updates for Tidelight.</description><lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items}</channel></rss>`;
  return new Response(body, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=300, stale-while-revalidate=900" } });
}
