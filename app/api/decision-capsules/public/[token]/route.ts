import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { capsuleHashMatches } from "@/lib/decision-capsules";
import { capsulePublicationHash, hashPublicationToken, verifyPublicCapsuleSnapshot } from "@/lib/decision-capsule-public";
import { reserveOAuthRateLimit } from "@/lib/tic/oauth-rate-limit";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };
const TOKEN = /^[A-Za-z0-9_-]{43}$/;
function snapshotMatches(snapshot: unknown, hash: string) { try { return capsuleHashMatches(snapshot, hash) && capsulePublicationHash(snapshot) === hash && verifyPublicCapsuleSnapshot(snapshot); } catch { return false; } }

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!TOKEN.test(token)) return NextResponse.json({ error: "Public capsule not found." }, { status: 404, headers: noStore });
  try {
    if (!await reserveOAuthRateLimit(request, "public_capsule", 60, 60)) return NextResponse.json({ error: "Public capsule request limit reached." }, { status: 429, headers: { ...noStore, "Retry-After": "60" } });
  } catch {
    return NextResponse.json({ error: "Public capsule verification is temporarily unavailable." }, { status: 503, headers: noStore });
  }
  let admin;
  try { admin = createAdminClient(); } catch { return NextResponse.json({ error: "Public capsule verification is unavailable." }, { status: 503, headers: noStore }); }
  const { data: publication, error } = await admin.from("decision_capsule_publications")
    .select("schema_version,public_snapshot,integrity_hash,created_at,revoked_at")
    .eq("token_hash", hashPublicationToken(token)).maybeSingle();
  if (error) return NextResponse.json({ error: "Public capsule could not be loaded." }, { status: 503, headers: noStore });
  if (!publication || publication.revoked_at) return NextResponse.json({ error: "Public capsule not found." }, { status: 404, headers: noStore });
  if (publication.schema_version !== 1 || !snapshotMatches(publication.public_snapshot, publication.integrity_hash)) {
    return NextResponse.json({ error: "Public capsule integrity verification failed." }, { status: 409, headers: noStore });
  }
  const headers = new Headers(noStore);
  if (new URL(request.url).searchParams.get("download") === "1") headers.set("Content-Disposition", 'attachment; filename="tidelight-public-decision-capsule.json"');
  return NextResponse.json({ schemaVersion: 1, publishedAt: publication.created_at, snapshot: publication.public_snapshot, integrityHash: publication.integrity_hash, hashAlgorithm: "sha256", integrity: "valid" }, { headers });
}
