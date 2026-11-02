import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerAuthState } from "@/lib/supabase/auth-user";
import { buildOriginalCapsuleSnapshot, capsuleHashMatches, capsuleSnapshotSize, hashCapsuleSnapshot, MAX_CAPSULE_SNAPSHOT_BYTES, type CapsuleEvidence, type CapsuleRun, type CapsuleSource } from "@/lib/decision-capsules";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const { user } = await getServerAuthState();
  if (!user) return NextResponse.json({ error: "Sign in to save a private decision capsule." }, { status: 401, headers: noStore });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Send a valid research run ID." }, { status: 400, headers: noStore }); }
  const runId = body && typeof body === "object" && "researchRunId" in body && typeof body.researchRunId === "string" ? body.researchRunId : "";
  if (!UUID.test(runId)) return NextResponse.json({ error: "A valid research run ID is required." }, { status: 400, headers: noStore });

  let admin;
  try { admin = createAdminClient(); } catch { return NextResponse.json({ error: "Private capsule storage is unavailable." }, { status: 503, headers: noStore }); }
  const { data: run, error: runError } = await admin.from("research_runs")
    .select("id,question,status,summary,created_at,completed_at,model_name")
    .eq("id", runId).eq("user_id", user.id).eq("status", "complete").maybeSingle();
  if (runError) return NextResponse.json({ error: "The research run could not be loaded." }, { status: 503, headers: noStore });
  if (!run) return NextResponse.json({ error: "That completed research run is unavailable." }, { status: 404, headers: noStore });

  const { data: existing, error: existingError } = await admin.from("decision_capsules")
    .select("id,created_at,original_snapshot,integrity_hash,hash_algorithm,schema_version")
    .eq("user_id", user.id).eq("research_run_id", runId).maybeSingle();
  if (existingError) return NextResponse.json({ error: "The existing private capsule could not be verified." }, { status: 503, headers: noStore });
  if (existing) {
    const valid = existing.schema_version === 1 && existing.hash_algorithm === "sha256" && capsuleHashMatches(existing.original_snapshot, existing.integrity_hash);
    if (valid) return NextResponse.json({ capsule: existing, integrity: "valid" }, { headers: noStore });
    return NextResponse.json({ error: "Existing capsule integrity verification failed." }, { status: 409, headers: noStore });
  }

  const { data: sources, error: sourcesError, count: sourceCount } = await admin.from("research_sources")
    .select("id,url,title,publisher,published_at,retrieved_at,source_type,excerpt,content_hash", { count: "exact" })
    .eq("research_run_id", runId).order("retrieved_at", { ascending: true }).limit(90);
  if (sourcesError) return NextResponse.json({ error: "Source lineage could not be captured." }, { status: 503, headers: noStore });
  if ((sourceCount ?? sources?.length ?? 0) === 0) return NextResponse.json({ error: "A decision capsule requires at least one persisted research source." }, { status: 422, headers: noStore });
  if ((sourceCount ?? 0) > (sources?.length ?? 0)) return NextResponse.json({ error: "This run has more source records than the capsule can capture completely." }, { status: 413, headers: noStore });

  const { data: evidence, error: evidenceError, count: evidenceCount } = await admin.from("research_evidence")
    .select("source_id,claim,supporting_quote,stance,confidence,created_at,quote_match_status,claim_support_status,passage_start_codepoint,passage_end_codepoint", { count: "exact" })
    .eq("research_run_id", runId).order("created_at", { ascending: true }).limit(500);
  if (evidenceError) return NextResponse.json({ error: "Persisted research claims could not be captured." }, { status: 503, headers: noStore });
  if ((evidenceCount ?? 0) > (evidence?.length ?? 0)) return NextResponse.json({ error: "This run has more claim records than the capsule can capture completely." }, { status: 413, headers: noStore });
  const capturedSourceIds = new Set((sources ?? []).map(source => source.id));
  if ((evidence ?? []).some(item => item.source_id !== null && !capturedSourceIds.has(item.source_id))) {
    return NextResponse.json({ error: "Source lineage changed while the decision capsule was being captured." }, { status: 409, headers: noStore });
  }

  const snapshot = buildOriginalCapsuleSnapshot(run as CapsuleRun, (sources ?? []) as CapsuleSource[], (evidence ?? []) as CapsuleEvidence[]);
  let integrityHash: string;
  try {
    if (capsuleSnapshotSize(snapshot) > MAX_CAPSULE_SNAPSHOT_BYTES) return NextResponse.json({ error: "This research record is too large to snapshot safely." }, { status: 413, headers: noStore });
    integrityHash = hashCapsuleSnapshot(snapshot);
  } catch {
    return NextResponse.json({ error: "The research record is not valid JSON and cannot be snapshotted." }, { status: 422, headers: noStore });
  }

  const { data: inserted, error: insertError } = await admin.from("decision_capsules")
    .insert({ user_id: user.id, research_run_id: runId, schema_version: 1, original_snapshot: snapshot, integrity_hash: integrityHash })
    .select("id,created_at,original_snapshot,integrity_hash,hash_algorithm,schema_version")
    .maybeSingle();
  if (insertError) {
    // Idempotency under concurrent requests: only disclose this owner's capsule.
    if (insertError.code === "23505") {
      const { data: existing, error } = await admin.from("decision_capsules").select("id,created_at,original_snapshot,integrity_hash,hash_algorithm,schema_version").eq("user_id", user.id).eq("research_run_id", runId).maybeSingle();
      if (!error && existing) {
        const valid = existing.schema_version === 1 && existing.hash_algorithm === "sha256" && capsuleHashMatches(existing.original_snapshot, existing.integrity_hash);
        if (valid) return NextResponse.json({ capsule: existing, integrity: "valid" }, { headers: noStore });
        return NextResponse.json({ error: "Existing capsule integrity verification failed." }, { status: 409, headers: noStore });
      }
    }
    return NextResponse.json({ error: "The private capsule could not be stored." }, { status: 503, headers: noStore });
  }
  if (!inserted) return NextResponse.json({ error: "The private capsule could not be stored." }, { status: 503, headers: noStore });
  return NextResponse.json({ capsule: inserted, integrity: "valid" }, { status: 201, headers: noStore });
}
