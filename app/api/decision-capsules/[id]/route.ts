import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerAuthState } from "@/lib/supabase/auth-user";
import { capsuleHashMatches } from "@/lib/decision-capsules";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await getServerAuthState();
  if (!user) return NextResponse.json({ error: "Sign in to verify a private decision capsule." }, { status: 401, headers: noStore });
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Capsule not found." }, { status: 404, headers: noStore });
  let admin;
  try { admin = createAdminClient(); } catch { return NextResponse.json({ error: "Private capsule storage is unavailable." }, { status: 503, headers: noStore }); }
  const { data: capsule, error } = await admin.from("decision_capsules")
    .select("id,created_at,original_snapshot,integrity_hash,hash_algorithm,schema_version")
    .eq("id", id).eq("user_id", user.id).maybeSingle();
  if (error) return NextResponse.json({ error: "The capsule could not be loaded." }, { status: 503, headers: noStore });
  if (!capsule) return NextResponse.json({ error: "Capsule not found." }, { status: 404, headers: noStore });
  if (capsule.schema_version !== 1 || capsule.hash_algorithm !== "sha256" || !capsuleHashMatches(capsule.original_snapshot, capsule.integrity_hash)) {
    return NextResponse.json({ error: "Capsule integrity verification failed." }, { status: 409, headers: noStore });
  }
  return NextResponse.json({ capsule, integrity: "valid" }, { headers: noStore });
}
