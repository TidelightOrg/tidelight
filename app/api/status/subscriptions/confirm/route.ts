import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveStatusPagePath } from "@/lib/tic/status-links";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const resultPath = resolveStatusPagePath(url.hostname, "/status");
  const redirectToResult = (result: string) => NextResponse.redirect(new URL(`${resultPath}?subscription=${result}`, request.url));
  const token = url.searchParams.get("token") ?? "";
  if (token.length < 30 || token.length > 100) return redirectToResult("invalid");
  const hash = createHash("sha256").update(token).digest("hex");
  const admin = createAdminClient();
  const { data: confirmed, error } = await admin.rpc("confirm_tic_status_subscription", { p_token_hash: hash });
  if (error) return redirectToResult("unavailable");
  return redirectToResult(confirmed ? "confirmed" : "invalid");
}