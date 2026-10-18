import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { containsCredentialLikeContent, isSupportEcosystem, readBoundedJson } from "@/lib/developer-support";
import { notifySupportOperators } from "@/lib/email/developer-support";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const json = (body: object, status = 200) => NextResponse.json(body, { status, headers: noStore });

function sameOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return json({ error: "Sign in to view support conversations." }, 401);
  try {
    const admin = createAdminClient();
    const { data, error: queryError } = await admin.from("developer_support_tickets")
      .select("id,ecosystem,subject,status,created_at,updated_at,last_activity_at")
      .eq("requester_user_id", user.id).order("last_activity_at", { ascending: false }).limit(50);
    if (queryError) throw queryError;
    return json({ tickets: data ?? [] });
  } catch {
    return json({ error: "Support conversations could not be loaded." }, 503);
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Open support from Tidelight." }, 403);
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user || !user.email) return json({ error: "Sign in to start a support conversation." }, 401);
  const parsed = await readBoundedJson(request, 12_000);
  if (parsed.error === "too_large") return json({ error: "Keep the conversation under 3,000 characters." }, 413);
  if (!parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) return json({ error: "Send a valid support request." }, 400);
  const body = parsed.value as Record<string, unknown>;

  const ecosystem = body.ecosystem;
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!isSupportEcosystem(ecosystem)) return json({ error: "Choose the Tidelight system you need help with." }, 400);
  if (subject.length < 3 || subject.length > 140) return json({ error: "Use a subject between 3 and 140 characters." }, 400);
  if (!message || message.length > 3000) return json({ error: "Write a message up to 3,000 characters." }, 400);
  if (containsCredentialLikeContent(message)) return json({ error: "Remove passwords, API keys, or verification codes before sending." }, 400);

  try {
    const admin = createAdminClient();
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: rateError } = await admin.from("developer_support_tickets").select("id", { count: "exact", head: true }).eq("requester_user_id", user.id).gt("created_at", since);
    if (rateError) throw rateError;
    if ((count ?? 0) >= 5) return json({ error: "You have reached the support request limit. Try again later." }, 429);

    const { data: ticket, error: ticketError } = await admin.from("developer_support_tickets").insert({
      requester_user_id: user.id,
      requester_email: user.email.trim().slice(0, 320),
      ecosystem,
      subject,
    }).select("id,ecosystem,subject,status,created_at,updated_at,last_activity_at").single();
    if (ticketError || !ticket) throw ticketError ?? new Error("Ticket was not created.");
    const { data: savedMessage, error: messageError } = await admin.from("developer_support_messages").insert({ ticket_id: ticket.id, author_user_id: user.id, author_kind: "requester", body: message }).select("id").single();
    if (messageError || !savedMessage) {
      await admin.from("developer_support_tickets").delete().eq("id", ticket.id).eq("requester_user_id", user.id);
      throw messageError;
    }

    let notificationState: "sent" | "partial" | "failed" = "failed";
    try {
      const result = await notifySupportOperators({ admin, ticketId: ticket.id, subject, ecosystem, event: "New conversation", eventKey: savedMessage.id });
      notificationState = result.delivered === result.total ? "sent" : result.delivered ? "partial" : "failed";
    } catch { /* The conversation remains available in the admin inbox if email delivery is unavailable. */ }
    const notifiedAt = notificationState === "sent" ? new Date().toISOString() : null;
    await admin.from("developer_support_tickets").update({ admin_notification_state: notificationState, admin_notified_at: notifiedAt }).eq("id", ticket.id);
    return json({ ticket, notificationState }, 201);
  } catch {
    return json({ error: "The support conversation could not be created. Please try again." }, 503);
  }
}
