import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerAuthState } from "@/lib/supabase/auth-user";
import { capsuleHashMatches } from "@/lib/decision-capsules";
import { MAX_CAPSULE_EVENTS, verifyCapsuleEventChain, type CapsuleEventRow } from "@/lib/decision-capsule-events";
import { buildPublicCapsuleSnapshot, capsuleHistoryHead, capsulePublicationConfirmationHash, capsulePublicationHash, hashPublicationToken, MAX_PUBLIC_CAPSULE_BYTES, type CapsulePublicationSelection, verifyPublicCapsuleSnapshot } from "@/lib/decision-capsule-public";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH = /^[a-f0-9]{64}$/;
const MAX_BODY_BYTES = 4 * 1024;
function capsuleSnapshotMatches(snapshot: unknown, hash: string) { try { return capsuleHashMatches(snapshot, hash); } catch { return false; } }
function publicSnapshotMatches(snapshot: unknown, hash: string) { try { return capsuleHashMatches(snapshot, hash) && verifyPublicCapsuleSnapshot(snapshot); } catch { return false; } }

function object(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype; }
function exactKeys(value: Record<string, unknown>, keys: string[]) { return Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key)); }
async function boundedJson(request: Request): Promise<unknown> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) throw new RangeError();
  if (!request.body) throw new SyntaxError();
  const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.byteLength; if (size > MAX_BODY_BYTES) { await reader.cancel(); throw new RangeError(); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

async function loadOwnerCapsule(admin: ReturnType<typeof createAdminClient>, userId: string, capsuleId: string) {
  const { data: capsule, error: capsuleError } = await admin.from("decision_capsules")
    .select("id,user_id,schema_version,original_snapshot,integrity_hash,hash_algorithm")
    .eq("id", capsuleId).eq("user_id", userId).maybeSingle();
  if (capsuleError) return { response: NextResponse.json({ error: "The private capsule could not be loaded." }, { status: 503, headers: noStore }) };
  if (!capsule) return { response: NextResponse.json({ error: "Capsule not found." }, { status: 404, headers: noStore }) };
  if (capsule.schema_version !== 1 || capsule.hash_algorithm !== "sha256" || !capsuleSnapshotMatches(capsule.original_snapshot, capsule.integrity_hash)) {
    return { response: NextResponse.json({ error: "Capsule integrity verification failed." }, { status: 409, headers: noStore }) };
  }
  const { data: rows, error: eventsError } = await admin.from("decision_capsule_events")
    .select("id,capsule_id,user_id,sequence,event_type,idempotency_key,forecast_event_id,payload,previous_hash,integrity_hash,created_at")
    .eq("capsule_id", capsuleId).eq("user_id", userId).order("sequence", { ascending: true }).limit(MAX_CAPSULE_EVENTS + 1);
  if (eventsError) return { response: NextResponse.json({ error: "Capsule history could not be verified." }, { status: 503, headers: noStore }) };
  if ((rows?.length ?? 0) > MAX_CAPSULE_EVENTS) return { response: NextResponse.json({ error: "Capsule history exceeds the verification limit." }, { status: 413, headers: noStore }) };
  const events = verifyCapsuleEventChain(capsuleId, capsule.integrity_hash, (rows ?? []) as CapsuleEventRow[]);
  if (!events) return { response: NextResponse.json({ error: "Capsule history integrity verification failed." }, { status: 409, headers: noStore }) };
  return { capsule, events, response: null };
}

function parseSelection(value: unknown): CapsulePublicationSelection | null {
  if (!object(value) || !exactKeys(value, ["research", "evidence", "events"]) || Object.values(value).some(item => typeof item !== "boolean") || !Object.values(value).some(Boolean)) return null;
  return value as CapsulePublicationSelection;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await getServerAuthState();
  if (!user) return NextResponse.json({ error: "Sign in to manage capsule sharing." }, { status: 401, headers: noStore });
  const { id: rawId } = await params; if (!UUID.test(rawId)) return NextResponse.json({ error: "Capsule not found." }, { status: 404, headers: noStore });
  let admin; try { admin = createAdminClient(); } catch { return NextResponse.json({ error: "Private capsule storage is unavailable." }, { status: 503, headers: noStore }); }
  const { data: publication, error } = await admin.from("decision_capsule_publications")
    .select("created_at,public_snapshot,integrity_hash,schema_version")
    .eq("capsule_id", rawId.toLowerCase()).eq("user_id", user.id).is("revoked_at", null).maybeSingle();
  if (error) return NextResponse.json({ error: "Capsule sharing status could not be loaded." }, { status: 503, headers: noStore });
  if (!publication) return NextResponse.json({ published: false }, { headers: noStore });
  if (publication.schema_version !== 1 || !publicSnapshotMatches(publication.public_snapshot, publication.integrity_hash)) return NextResponse.json({ error: "Public capsule integrity verification failed." }, { status: 409, headers: noStore });
  return NextResponse.json({ published: true, createdAt: publication.created_at, integrityHash: publication.integrity_hash }, { headers: noStore });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await getServerAuthState();
  if (!user) return NextResponse.json({ error: "Sign in to manage capsule sharing." }, { status: 401, headers: noStore });
  const { id: rawId } = await params; if (!UUID.test(rawId)) return NextResponse.json({ error: "Capsule not found." }, { status: 404, headers: noStore });
  const id = rawId.toLowerCase();
  let body: unknown; try { body = await boundedJson(request); } catch (cause) {
    const large = cause instanceof RangeError;
    return NextResponse.json({ error: large ? "Share request is too large." : "Send a valid capsule sharing request." }, { status: large ? 413 : 400, headers: noStore });
  }
  if (!object(body) || typeof body.action !== "string") return NextResponse.json({ error: "Choose a capsule sharing action." }, { status: 400, headers: noStore });

  let admin; try { admin = createAdminClient(); } catch { return NextResponse.json({ error: "Private capsule storage is unavailable." }, { status: 503, headers: noStore }); }
  if (body.action === "revoke") {
    if (!exactKeys(body, ["action"])) return NextResponse.json({ error: "Unsupported revocation fields." }, { status: 400, headers: noStore });
    const { data, error } = await admin.from("decision_capsule_publications")
      .update({ revoked_at: new Date().toISOString() }).eq("capsule_id", id).eq("user_id", user.id).is("revoked_at", null).select("id").maybeSingle();
    if (error) return NextResponse.json({ error: "The public capsule link could not be revoked." }, { status: 503, headers: noStore });
    if (!data) return NextResponse.json({ error: "No active public capsule link was found." }, { status: 404, headers: noStore });
    return NextResponse.json({ revoked: true }, { headers: noStore });
  }

  const selection = parseSelection(body.selection);
  if (body.action !== "preview" && body.action !== "publish") return NextResponse.json({ error: "Choose a supported capsule sharing action." }, { status: 400, headers: noStore });
  if (!selection) return NextResponse.json({ error: "Select at least one public section." }, { status: 400, headers: noStore });
  if (body.action === "publish" && (!exactKeys(body, ["action", "selection", "confirmed", "expectedConfirmationHash"]) || body.confirmed !== true || typeof body.expectedConfirmationHash !== "string" || !HASH.test(body.expectedConfirmationHash))) {
    return NextResponse.json({ error: "Review the public copy and confirm before publishing." }, { status: 400, headers: noStore });
  }
  if (body.action === "preview" && !exactKeys(body, ["action", "selection"])) return NextResponse.json({ error: "Unsupported preview fields." }, { status: 400, headers: noStore });

  const loaded = await loadOwnerCapsule(admin, user.id, id); if (loaded.response) return loaded.response;
  let publicSnapshot: Record<string, unknown>; let integrityHash: string; let confirmationHash: string; let historyHead: ReturnType<typeof capsuleHistoryHead>;
  try {
    publicSnapshot = buildPublicCapsuleSnapshot({ originalSnapshot: loaded.capsule.original_snapshot, capsuleIntegrityHash: loaded.capsule.integrity_hash, events: loaded.events, selection });
    if (!verifyPublicCapsuleSnapshot(publicSnapshot)) return NextResponse.json({ error: "The selected public sections could not be prepared." }, { status: 422, headers: noStore });
    integrityHash = capsulePublicationHash(publicSnapshot);
    historyHead = capsuleHistoryHead(loaded.capsule.integrity_hash, loaded.events);
    confirmationHash = capsulePublicationConfirmationHash(publicSnapshot, historyHead);
    if (Buffer.byteLength(JSON.stringify(publicSnapshot), "utf8") > MAX_PUBLIC_CAPSULE_BYTES) return NextResponse.json({ error: "This public projection is too large to publish safely." }, { status: 413, headers: noStore });
  } catch { return NextResponse.json({ error: "The selected public sections could not be prepared." }, { status: 422, headers: noStore }); }
  if (body.action === "preview") return NextResponse.json({ preview: publicSnapshot, integrityHash, confirmationHash }, { headers: noStore });
  if (body.expectedConfirmationHash !== confirmationHash) return NextResponse.json({ error: "Capsule history changed after preview. Review a fresh public copy." }, { status: 409, headers: noStore });

  const { data: existing, error: existingError } = await admin.from("decision_capsule_publications")
    .select("id").eq("capsule_id", id).eq("user_id", user.id).is("revoked_at", null).maybeSingle();
  if (existingError) return NextResponse.json({ error: "Capsule sharing status could not be verified." }, { status: 503, headers: noStore });
  if (existing) return NextResponse.json({ error: "An active public capsule link already exists. Revoke it before publishing a new copy." }, { status: 409, headers: noStore });

  const token = randomBytes(32).toString("base64url");
  const { data: inserted, error: insertError } = await admin.rpc("publish_decision_capsule_publication", {
    p_capsule_id: id,
    p_user_id: user.id,
    p_expected_history_sequence: historyHead.sequence,
    p_expected_history_hash: historyHead.hash,
    p_token_hash: hashPublicationToken(token),
    p_public_snapshot: publicSnapshot,
    p_integrity_hash: integrityHash,
  });
  if (insertError) {
    if (insertError.code === "23505") return NextResponse.json({ error: "An active public capsule link already exists. Revoke it before publishing a new copy." }, { status: 409, headers: noStore });
    if (insertError.code === "40001" || insertError.message === "capsule_event_head_changed") return NextResponse.json({ error: "Capsule history changed after preview. Review a fresh public copy." }, { status: 409, headers: noStore });
    return NextResponse.json({ error: "The public capsule could not be stored." }, { status: 503, headers: noStore });
  }
  if (!inserted || typeof inserted.created_at !== "string") return NextResponse.json({ error: "The public capsule could not be stored." }, { status: 503, headers: noStore });
  return NextResponse.json({ published: true, url: `/api/decision-capsules/public/${token}`, createdAt: inserted.created_at, integrityHash }, { status: 201, headers: noStore });
}
