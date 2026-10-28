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
  const entries = history.incidents.flatMap(incident => {
    const link = xml(base + incidentsPath + "#" + incident.id);
    const start = `<entry><id>urn:tidelight:status:${incident.id}:new</id><title>${xml(incident.component)} — Incident reported</title><updated>${new Date(incident.startedAt).toISOString()}</updated><summary>${xml(incident.detail)}</summary><link href="${link}"/></entry>`;
    const resolution = incident.resolvedAt ? `<entry><id>urn:tidelight:status:${incident.id}:resolved</id><title>${xml(incident.component)} — Service restored</title><updated>${new Date(incident.resolvedAt).toISOString()}</updated><summary>${xml(incident.detail)}</summary><link href="${link}"/></entry>` : "";
    return [start, ...(resolution ? [resolution] : [])];
  }).join("");
  const body = `<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom"><id>${xml(base + "/feed.atom")}</id><title>Tidelight status updates</title><updated>${new Date().toISOString()}</updated><author><name>Tidelight</name></author><link href="${xml(base)}"/>${entries}</feed>`;
  return new Response(body, { headers: { "Content-Type": "application/atom+xml; charset=utf-8", "Cache-Control": "public, max-age=300, stale-while-revalidate=900" } });
}
