import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (token.length < 30 || token.length > 100) return NextResponse.redirect(new URL("/?subscription=invalid", request.url));
  const hash = createHash("sha256").update(token).digest("hex");
  const admin = createAdminClient();
  const pending = await admin.from("tic_status_subscription_pending").select("email,components").eq("token_hash", hash).maybeSingle();
  if (pending.error) return NextResponse.redirect(new URL("/?subscription=unavailable", request.url));
  if (!pending.data) return NextResponse.redirect(new URL("/?subscription=invalid", request.url));
  const now = new Date().toISOString();
  const { error } = await admin.from("tic_status_subscriptions").upsert({
    email: pending.data.email, token_hash: hash, components: pending.data.components ?? [],
    confirmed_at: now, unsubscribed_at: null, created_at: now,
  }, { onConflict: "email" });
  if (error) return NextResponse.redirect(new URL("/?subscription=unavailable", request.url));
  await admin.from("tic_status_subscription_pending").delete().eq("email", pending.data.email);
  return NextResponse.redirect(new URL("/?subscription=confirmed", request.url));
}
