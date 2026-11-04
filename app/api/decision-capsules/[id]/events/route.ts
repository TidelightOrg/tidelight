import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerAuthState } from "@/lib/supabase/auth-user";
import { capsuleHashMatches } from "@/lib/decision-capsules";
import {
  buildCapsuleOutcomePayload,
  CapsuleEventValidationError,
  type CapsuleEventPayload,
  hashCapsuleEvent,
  MAX_CAPSULE_EVENTS,
  parseCapsuleEventInput,
  sameCapsuleEventInput,
  verifyCapsuleEventChain,
  type CapsuleEvent,
  type CapsuleEventRow,
} from "@/lib/decision-capsule-events";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BODY_BYTES = 20 * 1024;

type CapsuleRow = { id: string; user_id: string; schema_version: number; original_snapshot: unknown; integrity_hash: string; hash_algorithm: string };
type LoadedChain = { capsule: CapsuleRow; events: CapsuleEvent[] };
type LoadResult = { chain: LoadedChain; response: null } | { chain: null; response: Response };

async function loadChain(admin: ReturnType<typeof createAdminClient>, ownerId: string, capsuleId: string): Promise<LoadResult> {
  const { data: capsule, error: capsuleError } = await admin.from("decision_capsules")
    .select("id,user_id,schema_version,original_snapshot,integrity_hash,hash_algorithm")
    .eq("id", capsuleId).eq("user_id", ownerId).maybeSingle();
  if (capsuleError) return { chain: null, response: NextResponse.json({ error: "The private capsule could not be loaded." }, { status: 503, headers: noStore }) };
  if (!capsule) return { chain: null, response: NextResponse.json({ error: "Capsule not found." }, { status: 404, headers: noStore }) };
  const typedCapsule = capsule as CapsuleRow;
  if (typedCapsule.schema_version !== 1 || typedCapsule.hash_algorithm !== "sha256" || !capsuleHashMatches(typedCapsule.original_snapshot, typedCapsule.integrity_hash)) {
    return { chain: null, response: NextResponse.json({ error: "Capsule integrity verification failed." }, { status: 409, headers: noStore }) };
  }
  const { data: rows, error: eventsError } = await admin.from("decision_capsule_events")
    .select("id,capsule_id,user_id,sequence,event_type,idempotency_key,forecast_event_id,payload,previous_hash,integrity_hash,created_at")
    .eq("capsule_id", capsuleId).eq("user_id", ownerId).order("sequence", { ascending: true }).limit(MAX_CAPSULE_EVENTS + 1);
  if (eventsError) return { chain: null, response: NextResponse.json({ error: "Capsule history could not be verified." }, { status: 503, headers: noStore }) };
  if ((rows?.length ?? 0) > MAX_CAPSULE_EVENTS) return { chain: null, response: NextResponse.json({ error: "Capsule history exceeds the verification limit." }, { status: 413, headers: noStore }) };
  const events = verifyCapsuleEventChain(capsuleId, typedCapsule.integrity_hash, (rows ?? []) as CapsuleEventRow[]);
  if (!events) return { chain: null, response: NextResponse.json({ error: "Capsule history integrity verification failed." }, { status: 409, headers: noStore }) };
  return { chain: { capsule: typedCapsule, events }, response: null };
}

async function readBoundedJson(request: Request): Promise<unknown> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) throw new RangeError("body_too_large");
  if (!request.body) throw new SyntaxError("invalid_body");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new RangeError("body_too_large");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await getServerAuthState();
  if (!user) return NextResponse.json({ error: "Sign in to verify private capsule history." }, { status: 401, headers: noStore });
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Capsule not found." }, { status: 404, headers: noStore });
  let admin;
  try { admin = createAdminClient(); } catch { return NextResponse.json({ error: "Private capsule storage is unavailable." }, { status: 503, headers: noStore }); }
  const result = await loadChain(admin, user.id, id);
  if (result.response) return result.response;
  return NextResponse.json({ capsuleId: id, anchorHash: result.chain.capsule.integrity_hash, events: result.chain.events, integrity: "valid" }, { headers: noStore });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await getServerAuthState();
  if (!user) return NextResponse.json({ error: "Sign in to add to private capsule history." }, { status: 401, headers: noStore });
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Capsule not found." }, { status: 404, headers: noStore });
  let body: unknown;
  try { body = await readBoundedJson(request); }
  catch (error) {
    const tooLarge = error instanceof RangeError;
    return NextResponse.json({ error: tooLarge ? "Capsule event is too large." : "Send a valid capsule event." }, { status: tooLarge ? 413 : 400, headers: noStore });
  }
  let input;
  try { input = parseCapsuleEventInput(body); }
  catch (error) {
    if (error instanceof CapsuleEventValidationError) return NextResponse.json({ error: error.message }, { status: 400, headers: noStore });
    return NextResponse.json({ error: "Send a valid capsule event." }, { status: 400, headers: noStore });
  }

  let admin;
  try { admin = createAdminClient(); } catch { return NextResponse.json({ error: "Private capsule storage is unavailable." }, { status: 503, headers: noStore }); }
  const loaded = await loadChain(admin, user.id, id);
  if (loaded.response) return loaded.response;
  const { capsule, events } = loaded.chain;
  const retry = events.find(event => event.idempotencyKey === input.idempotencyKey);
  if (retry) {
    if (sameCapsuleEventInput(retry, input)) return NextResponse.json({ event: retry, integrity: "valid" }, { headers: noStore });
    return NextResponse.json({ error: "That idempotency key belongs to a different capsule event." }, { status: 409, headers: noStore });
  }
  if (events.length >= MAX_CAPSULE_EVENTS) return NextResponse.json({ error: "This capsule has reached its event limit." }, { status: 409, headers: noStore });

  let payload: CapsuleEventPayload;
  if (input.type === "outcome") {
    const forecast = events.find(event => event.id === input.forecastEventId);
    if (!forecast || forecast.type !== "forecast") return NextResponse.json({ error: "The referenced forecast is not in this capsule." }, { status: 422, headers: noStore });
    if (events.some(event => event.type === "outcome" && event.forecastEventId === forecast.id)) return NextResponse.json({ error: "This forecast already has a recorded outcome." }, { status: 409, headers: noStore });
    if (Date.parse(input.payload.observedAt) < Date.parse((forecast.payload as { horizonAt: string }).horizonAt)) return NextResponse.json({ error: "Record an outcome at or after the forecast horizon." }, { status: 422, headers: noStore });
    try { payload = buildCapsuleOutcomePayload(forecast, input.payload); }
    catch (error) {
      if (error instanceof CapsuleEventValidationError) return NextResponse.json({ error: error.message }, { status: 422, headers: noStore });
      return NextResponse.json({ error: "The outcome could not be calculated." }, { status: 422, headers: noStore });
    }
  } else payload = input.payload;

  const createdAt = new Date().toISOString();
  const unsigned: Omit<CapsuleEvent, "integrityHash"> = {
    id: randomUUID(), capsuleId: id, sequence: events.length + 1, type: input.type,
    idempotencyKey: input.idempotencyKey, forecastEventId: input.forecastEventId,
    payload, previousHash: events.at(-1)?.integrityHash ?? capsule.integrity_hash, createdAt,
  };
  const integrityHash = hashCapsuleEvent(unsigned);
  const { error } = await admin.rpc("append_decision_capsule_event", {
    p_capsule_id: id,
    p_event_id: unsigned.id,
    p_sequence: unsigned.sequence,
    p_event_type: unsigned.type,
    p_idempotency_key: unsigned.idempotencyKey,
    p_forecast_event_id: unsigned.forecastEventId,
    p_payload: unsigned.payload,
    p_previous_hash: unsigned.previousHash,
    p_integrity_hash: integrityHash,
    p_created_at: unsigned.createdAt,
  });
  if (error) {
    if (["40001", "23505"].includes(error.code ?? "")) {
      const refreshed = await loadChain(admin, user.id, id);
      if (refreshed.response) return refreshed.response;
      const concurrentRetry = refreshed.chain.events.find(event => event.idempotencyKey === input.idempotencyKey);
      if (concurrentRetry && sameCapsuleEventInput(concurrentRetry, input)) return NextResponse.json({ event: concurrentRetry, integrity: "valid" }, { headers: noStore });
      return NextResponse.json({ error: "Capsule history changed; reload it and retry." }, { status: 409, headers: noStore });
    }
    if (error.code === "P0002") return NextResponse.json({ error: "Capsule not found." }, { status: 404, headers: noStore });
    console.error("Capsule event append failed", { code: error.code ?? "unknown" });
    return NextResponse.json({ error: "The capsule event could not be stored." }, { status: 503, headers: noStore });
  }
  const persisted = await loadChain(admin, user.id, id);
  if (persisted.response) return persisted.response;
  const event = persisted.chain.events.find(item => item.id === unsigned.id);
  if (!event || event.integrityHash !== integrityHash) return NextResponse.json({ error: "The saved capsule event could not be verified." }, { status: 503, headers: noStore });
  return NextResponse.json({ event, integrity: "valid" }, { status: 201, headers: noStore });
}
