import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerAuthState } from "@/lib/supabase/auth-user";
import { buildSavedEvidenceGraph, savedGraphInputsWithinLimits, type SavedGraphEvidence, type SavedGraphRun, type SavedGraphSource } from "@/lib/saved-evidence-graph";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_SOURCES = 90;
const MAX_EVIDENCE = 500;

/** Return a bounded, owner-scoped provenance graph for an eligible saved brief. */
export async function GET(_request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const auth = await getServerAuthState();
  const authUnavailable = auth.errorName === "AuthRetryableFetchError" || auth.errorStatus === 429 || (auth.errorStatus !== null && auth.errorStatus >= 500) || (auth.errorName !== null && auth.errorStatus === null && auth.errorName !== "AuthSessionMissingError" && auth.errorCode === null);
  if (authUnavailable) return NextResponse.json({ error: "Tidelight could not verify your sign-in just now. Please retry shortly." }, { status: 503, headers: noStore });
  if (!auth.user) return NextResponse.json({ error: "Sign in to inspect saved evidence." }, { status: 401, headers: noStore });

  const { runId } = await params;
  if (!UUID.test(runId)) return NextResponse.json({ error: "A valid research record is required." }, { status: 400, headers: noStore });

  let db;
  try { db = createAdminClient(); } catch { return NextResponse.json({ error: "Saved evidence is temporarily unavailable." }, { status: 503, headers: noStore }); }
  const { data: run, error: runError } = await db.from("research_runs")
    .select("id,question,created_at,completed_at,summary,status")
    .eq("id", runId).eq("user_id", auth.user.id).eq("status", "complete").maybeSingle();
  if (runError) return NextResponse.json({ error: "Saved evidence is temporarily unavailable." }, { status: 503, headers: noStore });
  if (!run || !["source_matched_claims", "insufficient_evidence"].includes(String((run.summary as { answer_status?: unknown } | null)?.answer_status))) return NextResponse.json({ error: "That saved research record is unavailable." }, { status: 404, headers: noStore });

  const [{ data: sources, error: sourcesError, count: sourceCount }, { data: evidence, error: evidenceError, count: evidenceCount }] = await Promise.all([
    db.from("research_sources").select("id,url,title,publisher,published_at,retrieved_at,source_type,excerpt,content_hash", { count: "exact" }).eq("research_run_id", runId).order("retrieved_at", { ascending: true }).limit(MAX_SOURCES + 1),
    db.from("research_evidence").select("id,source_id,claim,supporting_quote,stance,confidence,created_at,quote_match_status,claim_support_status,passage_start_codepoint,passage_end_codepoint", { count: "exact" }).eq("research_run_id", runId).order("created_at", { ascending: true }).limit(MAX_EVIDENCE + 1),
  ]);
  if (sourcesError || evidenceError) return NextResponse.json({ error: "Saved evidence is temporarily unavailable." }, { status: 503, headers: noStore });
  if ((sourceCount ?? 0) > MAX_SOURCES || (evidenceCount ?? 0) > MAX_EVIDENCE || (sources?.length ?? 0) > MAX_SOURCES || (evidence?.length ?? 0) > MAX_EVIDENCE) return NextResponse.json({ error: "This research record exceeds the safe graph size; no partial graph was returned." }, { status: 413, headers: noStore });
  const boundedSources = (sources ?? []) as SavedGraphSource[];
  const boundedEvidence = (evidence ?? []) as SavedGraphEvidence[];
  if (!savedGraphInputsWithinLimits(boundedSources, boundedEvidence)) return NextResponse.json({ error: "This research record contains oversized saved text; no partial graph was returned." }, { status: 413, headers: noStore });

  try {
    const graph = buildSavedEvidenceGraph({ run: run as SavedGraphRun, sources: boundedSources, evidence: boundedEvidence });
    return NextResponse.json(graph, { headers: noStore });
  } catch {
    return NextResponse.json({ error: "The saved research record cannot be represented as a complete graph." }, { status: 422, headers: noStore });
  }
}
