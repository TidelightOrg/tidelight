import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSystemStatus } from "@/lib/tic/system-status";

export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const expected = process.env.TIC_RESEARCH_CRON_SECRET;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!expected || !provided) return false;
  const left = Buffer.from(expected), right = Buffer.from(provided);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized scheduled status check." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  try {
    const status = await getSystemStatus({ includeHistory: false });
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("record_tic_status_snapshot", {
      p_overall: status.status,
      p_components: status.components,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true, ...data }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "The scheduled status check did not complete." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

export const POST = GET;
