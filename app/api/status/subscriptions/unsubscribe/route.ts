import { createAdminClient } from "@/lib/supabase/admin";
import { validateStatusUnsubscribe } from "@/lib/tic/status-notifications";
import { resolveStatusPagePath } from "@/lib/tic/status-links";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const resultPath = resolveStatusPagePath(url.hostname, "/status");
  const redirectToResult = (result: string) => NextResponse.redirect(new URL(`${resultPath}?subscription=${result}`, request.url));
  const id = url.searchParams.get("id") ?? "";
  const signature = url.searchParams.get("signature") ?? "";
  if (!id || !validateStatusUnsubscribe(id, signature)) return redirectToResult("invalid");
  const admin = createAdminClient();
  const { error } = await admin.from("tic_status_subscriptions").update({ unsubscribed_at: new Date().toISOString() }).eq("id", id);
  return redirectToResult(error ? "unavailable" : "unsubscribed");
}
