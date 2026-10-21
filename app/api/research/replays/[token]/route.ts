import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ token: string }> };
const validToken = (token: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token);

export async function GET(request: Request, { params }: Context) {
  const { token } = await params;
  if (!validToken(token)) return NextResponse.json({ error: "Replay not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  const db = await createClient();
  const { data, error } = await db.from("public_research_replays").select("payload,created_at,expires_at").eq("public_id", token).is("revoked_at", null).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (error || !data) return NextResponse.json({ error: "This replay is unavailable or has expired." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  if (new URL(request.url).searchParams.get("format") === "json") return NextResponse.json({ ...data.payload, publishedAt: data.created_at, expiresAt: data.expires_at }, { headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ payload: data.payload, publishedAt: data.created_at, expiresAt: data.expires_at }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(_request: Request, { params }: Context) {
  const { token } = await params;
  if (!validToken(token)) return NextResponse.json({ error: "Replay not found." }, { status: 404 });
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to revoke your replay link." }, { status: 401 });
  const admin = createAdminClient();
  const { data, error } = await admin.from("public_research_replays").update({ revoked_at: new Date().toISOString() }).eq("public_id", token).eq("user_id", user.id).is("revoked_at", null).select("public_id").maybeSingle();
  if (error) return NextResponse.json({ error: "The replay could not be revoked." }, { status: 503 });
  if (!data) return NextResponse.json({ error: "That active replay link was not found." }, { status: 404 });
  return NextResponse.json({ revoked: true }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(_request: Request, { params }: Context) {
  const { token } = await params;
  if (!validToken(token)) return NextResponse.json({ error: "Replay not found." }, { status: 404 });
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to manage your replay links." }, { status: 401 });
  const admin = createAdminClient();
  const { data, error } = await admin.from("public_research_replays").select("public_id,expires_at,revoked_at,created_at").eq("public_id", token).eq("user_id", user.id).maybeSingle();
  if (error || !data) return NextResponse.json({ error: "That replay link was not found." }, { status: 404 });
  return NextResponse.json({ url: `/replay/${data.public_id}`, expiresAt: data.expires_at, revoked: Boolean(data.revoked_at), createdAt: data.created_at }, { headers: { "Cache-Control": "no-store" } });
}
