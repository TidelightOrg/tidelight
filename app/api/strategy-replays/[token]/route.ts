import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerAuthState } from "@/lib/supabase/auth-user";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ token: string }> };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request, { params }: Context) {
  const { token } = await params;
  if (!uuid.test(token)) return NextResponse.json({ error: "Replay not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  const db = await createClient();
  const { data, error } = await db.from("public_strategy_replays").select("payload,created_at,expires_at").eq("public_id", token).is("revoked_at", null).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (error || !data) return NextResponse.json({ error: "This replay is unavailable or has expired." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  const payload = data.payload as Record<string, unknown>;
  return NextResponse.json({ ...payload, publishedAt: data.created_at, expiresAt: data.expires_at }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(_request: Request, { params }: Context) {
  const { token } = await params;
  if (!uuid.test(token)) return NextResponse.json({ error: "Replay not found." }, { status: 404 });
  const auth = await getServerAuthState();
  if (auth.errorCode) return NextResponse.json({ error: "Tidelight could not verify your sign-in just now. Please retry shortly." }, { status: 503 });
  const { user } = auth;
  if (!user) return NextResponse.json({ error: "Sign in to revoke this strategy replay." }, { status: 401 });
  const admin = createAdminClient();
  const { data, error } = await admin.from("public_strategy_replays").update({ revoked_at: new Date().toISOString() }).eq("public_id", token).eq("user_id", user.id).is("revoked_at", null).select("public_id").maybeSingle();
  if (error) return NextResponse.json({ error: "The strategy replay could not be revoked." }, { status: 503 });
  if (!data) return NextResponse.json({ error: "That active strategy replay was not found." }, { status: 404 });
  return NextResponse.json({ revoked: true }, { headers: { "Cache-Control": "no-store" } });
}
