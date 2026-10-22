import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) return NextResponse.json({ error: "Replay link not found." }, { status: 404 });
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to revoke a Nightwatch replay." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const { data, error } = await createAdminClient().from("public_nightwatch_replays").update({ revoked_at: new Date().toISOString() }).eq("public_id", token).eq("user_id", user.id).is("revoked_at", null).select("public_id").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "That active replay link could not be revoked." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ revoked: true }, { headers: { "Cache-Control": "no-store" } });
}
