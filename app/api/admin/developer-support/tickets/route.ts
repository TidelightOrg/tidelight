import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTidelightOperator } from "@/lib/auth/operator-access";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || !isTidelightOperator(user)) return NextResponse.json({ error: "Operator access required." }, { status: 403, headers });
  try {
    const status = new URL(request.url).searchParams.get("status");
    const admin = createAdminClient();
    let query = admin.from("developer_support_tickets").select("id,requester_user_id,requester_email,ecosystem,subject,status,admin_notification_state,created_at,updated_at,last_activity_at").order("last_activity_at", { ascending: false }).limit(100);
    if (status === "active") query = query.in("status", ["open", "awaiting_user"]);
    else if (status && ["open", "awaiting_user", "resolved", "cancelled"].includes(status)) query = query.eq("status", status);
    const { data, error: queryError } = await query;
    if (queryError) throw queryError;
    const tickets = data ?? [];
    const counts = { open: 0, awaiting_user: 0, resolved: 0, cancelled: 0 };
    for (const ticket of tickets) counts[ticket.status as keyof typeof counts]++;
    return NextResponse.json({ tickets, counts }, { headers });
  } catch {
    return NextResponse.json({ error: "The support queue is unavailable." }, { status: 503, headers });
  }
}
