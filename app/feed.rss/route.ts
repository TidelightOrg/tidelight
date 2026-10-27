import { getStatusHistory } from "@/lib/tic/system-status";
export const dynamic = "force-dynamic";
const xml = (value: string) => value.replace(/[<>&'"]/g, c => ({ "<":"&lt;",">":"&gt;","&":"&amp;","'":"&apos;",'"':"&quot;" })[c]!);
export async function GET(request: Request) {
  const history = await getStatusHistory();
  const base = new URL(request.url).origin;
  const items = history.incidents.map(incident => `<item><title>${xml(incident.component)} — ${xml(incident.state)}</title><description>${xml(incident.detail)}</description><link>${xml(base + "/incidents#" + incident.id)}</link><guid isPermaLink="false">tidelight-status-${incident.id}-${incident.state}</guid><pubDate>${new Date(incident.resolvedAt ?? incident.startedAt).toUTCString()}</pubDate></item>`).join("");
  const body = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Tidelight status updates</title><link>${xml(base)}</link><description>Recorded incidents and service updates for Tidelight.</description><lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items}</channel></rss>`;
  return new Response(body, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=300, stale-while-revalidate=900" } });
}
