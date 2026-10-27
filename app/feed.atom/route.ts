import { getStatusHistory } from "@/lib/tic/system-status";
export const dynamic = "force-dynamic";
const xml = (value: string) => value.replace(/[<>&'"]/g, c => ({ "<":"&lt;",">":"&gt;","&":"&amp;","'":"&apos;",'"':"&quot;" })[c]!);
export async function GET(request: Request) {
  const history = await getStatusHistory();
  const base = new URL(request.url).origin;
  const entries = history.incidents.map(incident => `<entry><id>tidelight-status-${incident.id}-${incident.state}</id><title>${xml(incident.component)} — ${xml(incident.state)}</title><updated>${new Date(incident.resolvedAt ?? incident.startedAt).toISOString()}</updated><summary>${xml(incident.detail)}</summary><link href="${xml(base + "/incidents#" + incident.id)}"/></entry>`).join("");
  const body = `<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom"><id>${xml(base + "/feed.atom")}</id><title>Tidelight status updates</title><updated>${new Date().toISOString()}</updated><link href="${xml(base)}"/>${entries}</feed>`;
  return new Response(body, { headers: { "Content-Type": "application/atom+xml; charset=utf-8", "Cache-Control": "public, max-age=300, stale-while-revalidate=900" } });
}
