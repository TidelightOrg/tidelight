import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWithResend } from "@/lib/email/resend";
import { resolveStatusPagePath } from "@/lib/tic/status-links";

type Incident = { id: number; component: string; started_at: string; resolved_at: string | null; state: string; latest_detail: string };
type Subscription = { id: string; email: string; components: string[]; token_hash: string; confirmed_at: string };

function escapeHtml(value: string) { return value.replace(/[&<>"']/g, char => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" })[char]!); }
function signingSecret() { return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ""; }
function unsubscribeSignature(id: string) { return createHmac("sha256", signingSecret()).update("status-unsubscribe:" + id).digest("base64url"); }

export async function notifyStatusSubscribers() {
  const secret = signingSecret();
  if (!secret || !process.env.RESEND_API_KEY) return { sent: 0, skipped: true };
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [created, resolved] = await Promise.all([
    admin.from("tic_status_incidents").select("id,component,started_at,resolved_at,state,latest_detail").gte("started_at", cutoff).order("started_at", { ascending: false }).limit(250),
    admin.from("tic_status_incidents").select("id,component,started_at,resolved_at,state,latest_detail").gte("resolved_at", cutoff).not("resolved_at", "is", null).order("resolved_at", { ascending: false }).limit(250),
  ]);
  if (created.error || resolved.error) throw new Error("Status notification events could not be loaded.");
  const events = [
    ...(created.data ?? []).map(incident => ({ incident: incident as Incident, kind: "new" as const, at: incident.started_at })),
    ...(resolved.data ?? []).map(incident => ({ incident: incident as Incident, kind: "resolved" as const, at: incident.resolved_at! })),
  ];
  let sent = 0;
  for (let offset = 0; ; offset += 500) {
    const { data: batch, error: subscribersError } = await admin.from("tic_status_subscriptions").select("id,email,components,token_hash,confirmed_at").not("confirmed_at", "is", null).is("unsubscribed_at", null).order("id", { ascending: true }).range(offset, offset + 499);
    if (subscribersError) throw new Error("Status notification subscribers could not be loaded.");
    const subscriptions = (batch ?? []) as Subscription[];
    if (!subscriptions.length) break;
    const subscriptionIds = subscriptions.map(subscription => subscription.id);
    const incidentIds = [...new Set(events.map(event => event.incident.id))];
    const existingDeliveries: Array<{ subscription_id: string; incident_id: number; event_kind: string; delivery_status: string; claimed_at: string }> = [];
    for (let subscriptionOffset = 0; subscriptionOffset < subscriptionIds.length; subscriptionOffset += 40) {
      const subscriptionChunk = subscriptionIds.slice(subscriptionOffset, subscriptionOffset + 40);
      for (let incidentOffset = 0; incidentOffset < incidentIds.length; incidentOffset += 10) {
        const { data, error: deliveryLookupError } = await admin.from("tic_status_subscription_deliveries")
          .select("subscription_id,incident_id,event_kind,delivery_status,claimed_at")
          .in("subscription_id", subscriptionChunk)
          .in("incident_id", incidentIds.slice(incidentOffset, incidentOffset + 10));
        if (deliveryLookupError) throw new Error("Status notification delivery history could not be loaded.");
        existingDeliveries.push(...(data ?? []) as typeof existingDeliveries);
      }
    }
    const deliveryState = new Map(existingDeliveries.map(row => [`${row.subscription_id}:${row.incident_id}:${row.event_kind}`, row]));
    const staleClaimBefore = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    for (const event of events) {
      for (const subscription of subscriptions) {
      if (Date.parse(event.at) < Date.parse(subscription.confirmed_at)) continue;
      if (subscription.components?.length && !subscription.components.includes(event.incident.component)) continue;
      const deliveryKey = `${subscription.id}:${event.incident.id}:${event.kind}`;
      const prior = deliveryState.get(deliveryKey);
      if (prior?.delivery_status === "sent") continue;
      if (prior?.delivery_status === "pending") {
        if (prior.claimed_at >= staleClaimBefore) continue;
        const { error: releaseError } = await admin.from("tic_status_subscription_deliveries").delete()
          .eq("subscription_id", subscription.id).eq("incident_id", event.incident.id).eq("event_kind", event.kind)
          .eq("delivery_status", "pending").lt("claimed_at", staleClaimBefore);
        if (releaseError) continue;
      }
      const { data: claimed, error: claimError } = await admin.from("tic_status_subscription_deliveries").insert({
        subscription_id: subscription.id, incident_id: event.incident.id, event_kind: event.kind,
        delivery_status: "pending", claimed_at: new Date().toISOString(), sent_at: null,
      }).select("subscription_id").maybeSingle();
      if (claimError || !claimed) continue;
      const signature = unsubscribeSignature(subscription.id);
      const statusOrigin = process.env.STATUS_PAGE_URL || "https://status.tidelight.app";
      const statusHost = new URL(statusOrigin).host;
      const incidentUrl = new URL(resolveStatusPagePath(statusHost, "/status/incidents") + "#" + event.incident.id, statusOrigin).toString();
      const unsubscribe = new URL("/api/status/subscriptions/unsubscribe?id=" + encodeURIComponent(subscription.id) + "&signature=" + encodeURIComponent(signature), statusOrigin).toString();
      try {
        await sendWithResend({
          from: process.env.STATUS_EMAIL_FROM || process.env.EMAIL_FROM || "Tidelight Status <status@tidelight.app>",
          to: subscription.email,
          subject: `${event.kind === "new" ? "Service incident" : "Service restored"}: ${event.incident.component}`,
          html: `<p><strong>${escapeHtml(event.incident.component)}</strong> — ${event.kind === "new" ? "is experiencing an issue" : "has been resolved"}.</p><p>${escapeHtml(event.kind === "new" ? "Observed degraded during scheduled check" : event.incident.latest_detail)}</p><p><a href="${escapeHtml(incidentUrl)}">View status update</a></p><p><a href="${escapeHtml(unsubscribe)}">Unsubscribe from status emails</a></p>`,
          idempotencyKey: `status-${event.kind}:${event.incident.id}:${subscription.id}`,
        });
        const { error: markSentError } = await admin.from("tic_status_subscription_deliveries").update({ delivery_status: "sent", sent_at: new Date().toISOString() })
          .eq("subscription_id", subscription.id).eq("incident_id", event.incident.id).eq("event_kind", event.kind).eq("delivery_status", "pending");
        if (markSentError) throw markSentError;
        sent++;
      } catch {
        await admin.from("tic_status_subscription_deliveries").delete().eq("subscription_id", subscription.id).eq("incident_id", event.incident.id).eq("event_kind", event.kind).eq("delivery_status", "pending");
      }
      }
    }
    if (subscriptions.length < 500) break;
  }
  return { sent, skipped: false };
}

export function validateStatusUnsubscribe(id: string, signature: string) {
  const expected = unsubscribeSignature(id);
  const actual = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  return !!signingSecret() && actual.length === wanted.length && timingSafeEqual(actual, wanted);
}
