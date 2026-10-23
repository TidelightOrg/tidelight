import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseNightwatchReplayOrderId } from "@/lib/nightwatch-replay-request";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;
const object = (value: unknown): Row | null => value && typeof value === "object" && !Array.isArray(value) ? value as Row : null;
const boundedStrings = (value: unknown, max: number) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, max).map(item => item.slice(0, 240)) : [];

export async function POST(request: Request) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to publish a paper trade replay." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  let parsed: unknown;
  try { parsed = await request.json(); } catch { return NextResponse.json({ error: "Send a valid paper fill." }, { status: 400 }); }
  const orderId = parseNightwatchReplayOrderId(parsed);
  if (!orderId) return NextResponse.json({ error: "A valid paper fill is required." }, { status: 400 });

  const { data: order, error: orderError } = await db.from("nightwatch_orders").select("id,run_id,symbol,side,quantity,reference_price,simulated_fill_price,notional,fee,realized_pnl,created_at").eq("id", orderId).eq("user_id", user.id).maybeSingle();
  if (orderError || !order) return NextResponse.json({ error: "That paper fill is unavailable." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  const { data: run, error: runError } = await db.from("nightwatch_runs").select("signal,outcome,reason,as_of,reference_price,fast_sma,slow_sma,snapshot").eq("id", order.run_id).eq("user_id", user.id).maybeSingle();
  if (runError || !run) return NextResponse.json({ error: "The paper decision record is unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });

  const snapshot = object(run.snapshot);
  const agent = object(snapshot?.agent);
  const payload = {
    schemaVersion: 1,
    market: { symbol: order.symbol, side: order.side, quantity: Number(order.quantity), referencePrice: Number(order.reference_price), fillPrice: Number(order.simulated_fill_price), notional: Number(order.notional), fee: Number(order.fee), realizedPnl: order.realized_pnl === null ? null : Number(order.realized_pnl), filledAt: order.created_at },
    decision: { signal: run.signal, outcome: run.outcome, reason: String(run.reason).slice(0, 320), asOf: run.as_of, referencePrice: Number(run.reference_price), fastSma: Number(run.fast_sma), slowSma: Number(run.slow_sma), playbook: object(snapshot?.playbook)?.label ? String(object(snapshot?.playbook)?.label).slice(0, 120) : null, confidence: typeof agent?.confidence === "number" && Number.isFinite(agent.confidence) ? Math.max(0, Math.min(1, agent.confidence)) : null, rationale: typeof agent?.rationale === "string" ? agent.rationale.slice(0, 500) : null, evidence: boundedStrings(agent?.evidence, 5), risks: boundedStrings(agent?.risks, 5), invalidation: typeof agent?.invalidation === "string" ? agent.invalidation.slice(0, 240) : null, horizon: typeof agent?.horizon === "string" ? agent.horizon.slice(0, 120) : null },
    assumptions: { feeRate: "0.10% per side", adverseSlippage: "0.05%", venueOrderSent: false },
    notice: "Public Nightwatch paper replay. This simulated fill is not an exchange transaction, audited performance, or investment advice. Private account identifiers, balances, and other ledger rows are excluded.",
  };
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data: existing } = await admin.from("public_nightwatch_replays").select("public_id,expires_at").eq("user_id", user.id).eq("order_id", orderId).is("revoked_at", null).gt("expires_at", now).maybeSingle();
  if (existing) return NextResponse.json({ url: `/nightwatch/replay/${existing.public_id}`, expiresAt: existing.expires_at }, { headers: { "Cache-Control": "no-store" } });
  await admin.from("public_nightwatch_replays").update({ revoked_at: now }).eq("user_id", user.id).eq("order_id", orderId).is("revoked_at", null).lte("expires_at", now);
  const { data: replay, error } = await admin.from("public_nightwatch_replays").insert({ user_id: user.id, order_id: orderId, payload, expires_at: new Date(Date.now() + 30 * 86_400_000).toISOString() }).select("public_id,expires_at").single();
  if (error || !replay) return NextResponse.json({ error: "The public replay could not be created." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ url: `/nightwatch/replay/${replay.public_id}`, expiresAt: replay.expires_at }, { headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to manage Nightwatch replays." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const admin = createAdminClient();
  const { data, error } = await admin.from("public_nightwatch_replays").select("public_id,order_id,created_at,expires_at,revoked_at,payload").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: "Nightwatch replay links could not be loaded." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ replays: (data ?? []).map(row => ({ orderId: row.order_id, url: `/nightwatch/replay/${row.public_id}`, createdAt: row.created_at, expiresAt: row.expires_at, revoked: Boolean(row.revoked_at), expired: Date.parse(row.expires_at) <= Date.now(), symbol: String(object(row.payload)?.market && object(object(row.payload)?.market)?.symbol || "Paper trade") })) }, { headers: { "Cache-Control": "no-store" } });
}
