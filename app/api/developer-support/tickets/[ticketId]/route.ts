import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTidelightOperator } from "@/lib/auth/operator-access";
import { isSupportStatus, readBoundedJson } from "@/lib/developer-support";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const json = (body: object, status = 200) => NextResponse.json(body, { status, headers });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, context: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await context.params;
  if (!UUID.test(ticketId)) return json({ error: "Conversation not found." }, 404);
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return json({ error: "Sign in to view this conversation." }, 401);
  const operator = isTidelightOperator(user);
  try {
    const admin = createAdminClient();
    let ticketQuery = admin.from("developer_support_tickets").select("id,requester_user_id,requester_email,ecosystem,subject,status,admin_notification_state,created_at,updated_at,last_activity_at").eq("id", ticketId);
    if (!operator) ticketQuery = ticketQuery.eq("requester_user_id", user.id);
    const { data: ticket, error: ticketError } = await ticketQuery.maybeSingle();
    if (ticketError) throw ticketError;
    if (!ticket) return json({ error: "Conversation not found." }, 404);
    const { data: messages, error: messageError } = await admin.from("developer_support_messages").select("id,author_user_id,author_kind,body,created_at").eq("ticket_id", ticketId).order("created_at", { ascending: true }).limit(250);
    if (messageError) throw messageError;
    return json({ ticket, messages: messages ?? [] });
  } catch {
    return json({ error: "The conversation could not be loaded." }, 503);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ ticketId: string }> }) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return json({ error: "Open the support queue from Tidelight." }, 403);
  const { ticketId } = await context.params;
  if (!UUID.test(ticketId)) return json({ error: "Conversation not found." }, 404);
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || !isTidelightOperator(user)) return json({ error: "Operator access required." }, 403);
  const parsed = await readBoundedJson(request, 1024);
  if (parsed.error === "too_large") return json({ error: "Choose a valid conversation status." }, 413);
  if (!parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) return json({ error: "Choose a valid conversation status." }, 400);
  const body = parsed.value as { status?: unknown };
  if (!isSupportStatus(body.status)) return json({ error: "Choose a valid conversation status." }, 400);
  try {
    const admin = createAdminClient();
    const { data, error: updateError } = await admin.from("developer_support_tickets").update({ status: body.status, updated_at: new Date().toISOString(), last_activity_at: new Date().toISOString() }).eq("id", ticketId).select("id,status,updated_at,last_activity_at").maybeSingle();
    if (updateError) throw updateError;
    if (!data) return json({ error: "Conversation not found." }, 404);
    return json({ ticket: data });
  } catch {
    return json({ error: "Conversation status could not be updated." }, 503);
  }
}
