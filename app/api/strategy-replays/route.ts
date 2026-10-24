import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to publish a strategy replay." }, { status: 401 });
  let body: { runId?: unknown };
  try { body = await request.json() as typeof body; } catch { return NextResponse.json({ error: "Send a valid strategy run." }, { status: 400 }); }
  const runId = typeof body.runId === "string" && uuid.test(body.runId) ? body.runId : "";
  if (!runId) return NextResponse.json({ error: "A saved strategy run is required." }, { status: 400 });
  const { data: run, error: runError } = await db.from("strategy_backtest_runs").select("id,symbol,interval,strategy_key,parameters,train_metrics,test_metrics,data_start,data_end,candle_count,candles,created_at").eq("id", runId).eq("user_id", user.id).maybeSingle();
  if (runError || !run) return NextResponse.json({ error: "That saved strategy run is unavailable." }, { status: 404 });
  const params = run.parameters && typeof run.parameters === "object" && !Array.isArray(run.parameters) ? run.parameters as Record<string, unknown> : {};
  const publicParameters = { ...params };
  delete publicParameters.researchRunId;
  const candles = Array.isArray(run.candles) ? run.candles : [];
  if (!candles.length || candles.length > 1000 || typeof params.candleHash !== "string" || !/^[0-9a-f]{64}$/i.test(params.candleHash)) return NextResponse.json({ error: "This run does not contain a complete reproducible candle archive." }, { status: 422 });
  const payload = {
    schemaVersion: 1,
    run: { id: run.id, symbol: run.symbol, interval: run.interval, strategyKey: run.strategy_key, parameters: publicParameters, dataStart: run.data_start, dataEnd: run.data_end, candleCount: run.candle_count, candleHash: params.candleHash, createdAt: run.created_at },
    asset: { name: typeof params.assetName === "string" ? params.assetName.slice(0, 160) : run.symbol, kind: typeof params.assetKind === "string" ? params.assetKind.slice(0, 48) : "unknown" },
    train: run.train_metrics,
    holdout: run.test_metrics,
    candles,
    notice: "Public historical simulation. Candles and assumptions are archived for reproduction; this is not a forecast, investment recommendation, or live execution record.",
  };
  if (Buffer.byteLength(JSON.stringify(payload), "utf8") > 600_000) return NextResponse.json({ error: "This archived run is too large to publish safely." }, { status: 413 });
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data: existing } = await admin.from("public_strategy_replays").select("public_id,expires_at").eq("user_id", user.id).eq("strategy_run_id", runId).is("revoked_at", null).gt("expires_at", now).maybeSingle();
  if (existing) return NextResponse.json({ url: `/strategy-replay/${existing.public_id}`, expiresAt: existing.expires_at }, { headers: { "Cache-Control": "no-store" } });
  await admin.from("public_strategy_replays").update({ revoked_at: now }).eq("user_id", user.id).eq("strategy_run_id", runId).is("revoked_at", null).lte("expires_at", now);
  const expiresAt = new Date(Date.now() + 30 * 86_400_000).toISOString();
  const { data: replay, error } = await admin.from("public_strategy_replays").insert({ user_id: user.id, strategy_run_id: runId, payload, expires_at: expiresAt }).select("public_id,expires_at").single();
  if (error || !replay) return NextResponse.json({ error: "The public strategy replay could not be created." }, { status: 503 });
  return NextResponse.json({ url: `/strategy-replay/${replay.public_id}`, expiresAt: replay.expires_at }, { headers: { "Cache-Control": "no-store" } });
}
