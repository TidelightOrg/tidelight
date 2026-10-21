import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export async function POST(request: Request) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to publish a research replay." }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Send a valid research run." }, { status: 400 }); }
  const runId = typeof body.researchRunId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.researchRunId) ? body.researchRunId : "";
  if (!runId) return NextResponse.json({ error: "A valid completed research run is required." }, { status: 400 });

  const { data: run, error: runError } = await db.from("research_runs").select("question,summary,completed_at,status").eq("id", runId).eq("user_id", user.id).eq("status", "complete").maybeSingle();
  if (runError || !run) return NextResponse.json({ error: "That completed research run is unavailable." }, { status: 404 });
  const summary = object(run.summary);
  const rows = Array.isArray(summary?.assets) ? summary.assets : [];
  if (!summary || rows.length < 1 || rows.length > 3) return NextResponse.json({ error: "This research run does not contain a shareable result." }, { status: 422 });

  const { data: sourceRows, error: sourcesError } = await db.from("research_sources").select("url,title,publisher,published_at,retrieved_at").eq("research_run_id", runId).limit(90);
  if (sourcesError) return NextResponse.json({ error: "Source lineage could not be loaded." }, { status: 503 });
  const sources = (sourceRows ?? []).flatMap((source) => {
    try {
      const url = new URL(source.url);
      if (url.protocol !== "https:" || url.username || url.password) return [];
      return [{ url: url.toString(), title: String(source.title ?? "").slice(0, 300), publisher: String(source.publisher ?? "Unknown publisher").slice(0, 120), publishedAt: source.published_at, capturedAt: source.retrieved_at }];
    } catch { return []; }
  });
  const assets = rows.flatMap((raw) => {
    const row = object(raw);
    if (!row || typeof row.ticker !== "string" || !/^[A-Z]{1,8}$/.test(row.ticker) || typeof row.issuer !== "string" || typeof row.summary !== "string") return [];
    const market = object(row.market) ?? {};
    const stance = ["bullish", "bearish", "mixed", "unclear"].includes(String(row.stance)) ? row.stance : "unclear";
    const confidence = typeof row.confidence === "number" && Number.isFinite(row.confidence) ? Math.max(0, Math.min(1, row.confidence)) : 0;
    const allowedSources = new Set(sources.map(source => source.url));
    const usedSources = Array.isArray(row.sources) ? row.sources.flatMap((rawSource) => {
      const source = object(rawSource);
      if (!source || typeof source.url !== "string" || !allowedSources.has(source.url)) return [];
      return [source.url];
    }) : [];
    const usedSourceSet = new Set(usedSources);
    const balance = object(row.evidenceBalance) ?? {};
    const evidencePoints = (items: unknown) => Array.isArray(items) ? items.flatMap((rawPoint) => {
      const point = object(rawPoint);
      if (!point || typeof point.text !== "string") return [];
      const citedUrls = Array.isArray(point.citedUrls) ? [...new Set(point.citedUrls.filter((url): url is string => typeof url === "string" && usedSourceSet.has(url)))].slice(0, 3) : [];
      return citedUrls.length ? [{ text: point.text.slice(0, 260), citedUrls }] : [];
    }).slice(0, 3) : [];
    return [{
      ticker: row.ticker,
      issuer: row.issuer.slice(0, 160),
      summary: row.summary.slice(0, 700),
      stance,
      confidence: Boolean(row.confidenceCapped) ? Math.min(confidence, 0.4) : confidence,
      confidenceCapped: Boolean(row.confidenceCapped),
      gateReasons: Array.isArray(row.gateReasons) ? row.gateReasons.filter((item): item is string => typeof item === "string").slice(0, 8).map(item => item.slice(0, 220)) : [],
      sources: [...usedSourceSet],
      evidenceBalance: { supporting: evidencePoints(balance.supporting), counter: evidencePoints(balance.counter) },
      market: { symbol: typeof market.perpSymbol === "string" ? market.perpSymbol : null, price: typeof market.lastPrice === "number" && Number.isFinite(market.lastPrice) ? market.lastPrice : null, providerTimestamp: typeof market.providerTimestamp === "number" ? market.providerTimestamp : null },
      risks: Array.isArray(row.risks) ? row.risks.filter((item): item is string => typeof item === "string").slice(0, 5).map(item => item.slice(0, 220)) : [],
      nextCheck: typeof row.nextCheck === "string" ? row.nextCheck.slice(0, 220) : null,
    }];
  });
  if (assets.length !== rows.length) return NextResponse.json({ error: "This run contains an unsupported result shape and cannot be safely shared." }, { status: 422 });
  const trace = Array.isArray(summary.trace) ? summary.trace.flatMap((rawStage) => {
    const stage = object(rawStage);
    if (!stage || typeof stage.title !== "string" || typeof stage.agent !== "string") return [];
    return [{ agent: stage.agent.slice(0, 80), status: ["complete", "blocked", "running"].includes(String(stage.status)) ? stage.status : "blocked", title: stage.title.slice(0, 160), at: typeof stage.at === "string" ? stage.at : null, asset: typeof stage.asset === "string" ? stage.asset.slice(0, 12) : null }];
  }).slice(0, 40) : [];
  const citedUrlSet = new Set(assets.flatMap(asset => asset.sources));
  const publicSources = sources.filter(source => citedUrlSet.has(source.url));
  const payload = { schemaVersion: 1, question: String(run.question).slice(0, 500), capturedAt: typeof run.completed_at === "string" ? run.completed_at : new Date().toISOString(), assets, sources: publicSources, trace, notice: "Owner-published public replay. Market values are snapshots, AI summaries are interpretations, and this is not investment advice or audited performance." };
  const expiresAt = new Date(Date.now() + 30 * 86_400_000).toISOString();
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data: existing } = await admin.from("public_research_replays").select("public_id,expires_at").eq("user_id", user.id).eq("research_run_id", runId).is("revoked_at", null).gt("expires_at", now).maybeSingle();
  if (existing) return NextResponse.json({ url: `/replay/${existing.public_id}`, expiresAt: existing.expires_at }, { headers: { "Cache-Control": "no-store" } });
  await admin.from("public_research_replays").update({ revoked_at: now }).eq("user_id", user.id).eq("research_run_id", runId).is("revoked_at", null).lte("expires_at", now);
  const { data: replay, error } = await admin.from("public_research_replays").insert({ user_id: user.id, research_run_id: runId, payload, expires_at: expiresAt }).select("public_id,expires_at").single();
  if (error || !replay) return NextResponse.json({ error: "The public replay could not be created." }, { status: 503 });
  return NextResponse.json({ url: `/replay/${replay.public_id}`, expiresAt: replay.expires_at }, { headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to manage your replay links." }, { status: 401 });
  const admin = createAdminClient();
  const { data, error } = await admin.from("public_research_replays").select("public_id,created_at,expires_at,revoked_at,payload").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
  if (error) return NextResponse.json({ error: "Replay links could not be loaded." }, { status: 503 });
  const replays = (data ?? []).map((row) => {
    const payload = object(row.payload);
    return { url: `/replay/${row.public_id}`, createdAt: row.created_at, expiresAt: row.expires_at, revoked: Boolean(row.revoked_at), expired: Date.parse(row.expires_at) <= Date.now(), question: typeof payload?.question === "string" ? payload.question.slice(0, 240) : "Research replay" };
  });
  return NextResponse.json({ replays }, { headers: { "Cache-Control": "no-store" } });
}
