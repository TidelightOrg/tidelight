import { createAdminClient } from "@/lib/supabase/admin";
import { validateStatusUnsubscribe } from "@/lib/tic/status-notifications";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id") ?? "";
  const signature = url.searchParams.get("signature") ?? "";
  if (!id || !validateStatusUnsubscribe(id, signature)) return NextResponse.redirect(new URL("/?subscription=invalid", request.url));
  const admin = createAdminClient();
  await admin.from("tic_status_subscriptions").update({ unsubscribed_at: new Date().toISOString() }).eq("id", id);
  return NextResponse.redirect(new URL("/?subscription=unsubscribed", request.url));
}
