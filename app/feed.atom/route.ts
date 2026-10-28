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
  const entries = history.events.map(event => {
    const link = xml(base + incidentsPath + "#" + event.id);
    const title = event.kind === "new" ? "Incident reported" : "Service restored";
    return `<entry><id>urn:tidelight:status:${event.id}:${event.kind}</id><title>${xml(event.component)} — ${title}</title><updated>${new Date(event.occurredAt).toISOString()}</updated><summary>${xml(event.detail)}</summary><link href="${link}"/></entry>`;
  }).join("");
  const body = `<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom"><id>${xml(base + "/feed.atom")}</id><title>Tidelight status updates</title><updated>${new Date().toISOString()}</updated><author><name>Tidelight</name></author><link href="${xml(base)}"/>${entries}</feed>`;
  return new Response(body, { headers: { "Content-Type": "application/atom+xml; charset=utf-8", "Cache-Control": "public, max-age=300, stale-while-revalidate=900" } });
}
