import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (token.length < 30 || token.length > 100) return NextResponse.redirect(new URL("/?subscription=invalid", request.url));
  const hash = createHash("sha256").update(token).digest("hex");
  const admin = createAdminClient();
  const { error } = await admin.from("tic_status_subscriptions").update({ confirmed_at: new Date().toISOString() }).eq("token_hash", hash).is("unsubscribed_at", null);
  return NextResponse.redirect(new URL(error ? "/?subscription=unavailable" : "/?subscription=confirmed", request.url));
}
