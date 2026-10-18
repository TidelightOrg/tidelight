import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTidelightOperator } from "@/lib/auth/operator-access";
import { containsCredentialLikeContent, readBoundedJson } from "@/lib/developer-support";
import { notifySupportOperators, notifySupportRequester } from "@/lib/email/developer-support";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const json = (body: object, status = 200) => NextResponse.json(body, { status, headers });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request, context: { params: Promise<{ ticketId: string }> }) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return json({ error: "Open support from Tidelight." }, 403);
  const { ticketId } = await context.params;
  if (!UUID.test(ticketId)) return json({ error: "Conversation not found." }, 404);
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: "Sign in to reply." }, 401);
  const parsed = await readBoundedJson(request, 8_000);
  if (parsed.error === "too_large") return json({ error: "Keep each message under 3,000 characters." }, 413);
  if (!parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) return json({ error: "Send a valid message." }, 400);
  const body = parsed.value as { message?: unknown };
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message || message.length > 3000) return json({ error: "Write a message up to 3,000 characters." }, 400);
  if (containsCredentialLikeContent(message)) return json({ error: "Remove passwords, API keys, or verification codes before sending." }, 400);

  try {
    const admin = createAdminClient();
    const operator = isTidelightOperator(user);
    const { data: ticket, error: ticketError } = await admin.from("developer_support_tickets").select("id,requester_user_id,requester_email,ecosystem,subject,status").eq("id", ticketId).maybeSingle();
    if (ticketError) throw ticketError;
    if (!ticket || (!operator && ticket.requester_user_id !== user.id)) return json({ error: "Conversation not found." }, 404);
    if (ticket.status === "cancelled" || ticket.status === "resolved") return json({ error: "Reopen this conversation with support before replying." }, 409);

    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: rateError } = await admin.from("developer_support_messages").select("id", { count: "exact", head: true }).eq("author_user_id", user.id).gt("created_at", since);
    if (rateError) throw rateError;
    if ((count ?? 0) >= 30) return json({ error: "You have reached the message limit. Try again later." }, 429);

    const authorKind = operator ? "admin" : "requester";
    const { data: saved, error: insertError } = await admin.from("developer_support_messages").insert({ ticket_id: ticketId, author_user_id: user.id, author_kind: authorKind, body: message }).select("id,author_user_id,author_kind,body,created_at").single();
    if (insertError || !saved) throw insertError ?? new Error("Message was not saved.");
    const status = operator ? "awaiting_user" : "open";
    await admin.from("developer_support_tickets").update({ status, updated_at: new Date().toISOString(), last_activity_at: new Date().toISOString() }).eq("id", ticketId);
    if (!operator) {
      try { await notifySupportOperators({ admin, ticketId, subject: ticket.subject, ecosystem: ticket.ecosystem, event: "New message", eventKey: saved.id }); }
      catch { /* New messages remain visible in the authenticated admin inbox. */ }
    } else {
      try { await notifySupportRequester({ admin, userId: ticket.requester_user_id, ticketId, subject: ticket.subject, eventKey: saved.id }); }
      catch { /* Replies remain visible in the authenticated requester inbox. */ }
    }
    return json({ message: saved, ticketStatus: status }, 201);
  } catch {
    return json({ error: "Your message could not be sent. Please try again." }, 503);
  }
}
