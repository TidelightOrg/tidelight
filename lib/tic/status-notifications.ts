import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWithResend } from "@/lib/email/resend";

type Incident = { id: number; component: string; started_at: string; resolved_at: string | null; state: string; latest_detail: string };
type Subscription = { id: string; email: string; components: string[]; token_hash: string };

function escapeHtml(value: string) { return value.replace(/[&<>"']/g, char => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" })[char]!); }
function signingSecret() { return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ""; }
function unsubscribeSignature(id: string) { return createHmac("sha256", signingSecret()).update("status-unsubscribe:" + id).digest("base64url"); }

export async function notifyStatusSubscribers() {
  const secret = signingSecret();
  if (!secret || !process.env.RESEND_API_KEY) return { sent: 0, skipped: true };
  const admin = createAdminClient();
  const since = new Date(Date.now() - 20 * 60 * 1000).toISOString();
  const [created, resolved, subscriptions] = await Promise.all([
    admin.from("tic_status_incidents").select("id,component,started_at,resolved_at,state,latest_detail").gte("started_at", since).order("started_at", { ascending: true }),
    admin.from("tic_status_incidents").select("id,component,started_at,resolved_at,state,latest_detail").gte("resolved_at", since).not("resolved_at", "is", null).order("resolved_at", { ascending: true }),
    admin.from("tic_status_subscriptions").select("id,email,components,token_hash").not("confirmed_at", "is", null).is("unsubscribed_at", null).limit(500),
  ]);
  if (created.error || resolved.error || subscriptions.error) throw new Error("Status notification records could not be loaded.");
  const events = [
    ...(created.data ?? []).map(incident => ({ incident: incident as Incident, kind: "new" as const, at: incident.started_at })),
    ...(resolved.data ?? []).map(incident => ({ incident: incident as Incident, kind: "resolved" as const, at: incident.resolved_at! })),
  ];
  let sent = 0;
  for (const event of events) {
    for (const subscription of (subscriptions.data ?? []) as Subscription[]) {
      if (subscription.components?.length && !subscription.components.includes(event.incident.component)) continue;
      const alreadySent = await admin.from("tic_status_subscription_deliveries").select("subscription_id").eq("subscription_id", subscription.id).eq("incident_id", event.incident.id).eq("event_kind", event.kind).maybeSingle();
      if (alreadySent.error) continue;
      if (alreadySent.data) continue;
      const { data: claimed, error: claimError } = await admin.from("tic_status_subscription_deliveries").insert({ subscription_id: subscription.id, incident_id: event.incident.id, event_kind: event.kind, sent_at: new Date().toISOString() }).select("subscription_id").maybeSingle();
      if (claimError || !claimed) continue;
      const signature = unsubscribeSignature(subscription.id);
      const unsubscribe = `${process.env.NEXT_PUBLIC_APP_URL || "https://status.tidelight.app"}/api/status/subscriptions/unsubscribe?id=${encodeURIComponent(subscription.id)}&signature=${encodeURIComponent(signature)}`;
      try {
        await sendWithResend({
          from: process.env.STATUS_EMAIL_FROM || process.env.EMAIL_FROM || "Tidelight Status <status@tidelight.app>",
          to: subscription.email,
          subject: `${event.kind === "new" ? "Service incident" : "Service restored"}: ${event.incident.component}`,
          html: `<p><strong>${escapeHtml(event.incident.component)}</strong> — ${event.kind === "new" ? "is experiencing an issue" : "has been resolved"}.</p><p>${escapeHtml(event.incident.latest_detail)}</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL || "https://status.tidelight.app"}/incidents#${event.incident.id}">View status update</a></p><p><a href="${unsubscribe}">Unsubscribe from status emails</a></p>`,
          idempotencyKey: `status-${event.kind}:${event.incident.id}:${subscription.id}`,
        });
        sent++;
      } catch {
        await admin.from("tic_status_subscription_deliveries").delete().eq("subscription_id", subscription.id).eq("incident_id", event.incident.id).eq("event_kind", event.kind);
      }
    }
  }
  return { sent, skipped: false };
}

export function validateStatusUnsubscribe(id: string, signature: string) {
  const expected = unsubscribeSignature(id);
  const actual = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  return !!signingSecret() && actual.length === wanted.length && timingSafeEqual(actual, wanted);
}
