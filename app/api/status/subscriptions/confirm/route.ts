import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (token.length < 30 || token.length > 100) return NextResponse.redirect(new URL("/?subscription=invalid", request.url));
  const hash = createHash("sha256").update(token).digest("hex");
  const admin = createAdminClient();
  const { data: confirmed, error } = await admin.rpc("confirm_tic_status_subscription", { p_token_hash: hash });
  if (error) return NextResponse.redirect(new URL("/?subscription=unavailable", request.url));
  return NextResponse.redirect(new URL(confirmed ? "/?subscription=confirmed" : "/?subscription=invalid", request.url));
}