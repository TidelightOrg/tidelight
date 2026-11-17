import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ALPHA_STRATEGIES, runBacktest, type BacktestMetrics, type StrategyKey } from "@/lib/backtest";
import { BACKTEST_ENGINE_VERSION, backtestManifestMatchesRun, verifyBacktestExperimentManifest } from "@/lib/backtest-manifest";
import { backtestMetricsMatch } from "@/lib/backtest-result-integrity";
import { createClient } from "@/lib/supabase/server";
import { getServerAuthState } from "@/lib/supabase/auth-user";
import type { MarketCandle } from "@/lib/bitget-market";
import "./saved-run.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Saved strategy replay · Tidelight", robots: { index: false, follow: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type MetricSummary = Pick<BacktestMetrics, "totalReturnPct" | "buyAndHoldReturnPct" | "maxDrawdownPct" | "trades" | "winRatePct" | "endingEquity" | "equityCurve">;

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function metricSummary(value: unknown): MetricSummary | null {
  const metric = object(value);
  const equityCurve = Array.isArray(metric.equityCurve) ? metric.equityCurve.slice(-1000).filter((point) => {
    const row = object(point);
    return Number.isSafeInteger(row.timestamp) && typeof row.equity === "number" && Number.isFinite(row.equity);
  }).map(point => ({ timestamp: Number((point as Record<string, unknown>).timestamp), equity: Number((point as Record<string, unknown>).equity) })) : [];
  const required = [metric.totalReturnPct, metric.buyAndHoldReturnPct, metric.maxDrawdownPct, metric.trades, metric.endingEquity];
  if (required.some(value => typeof value !== "number" || !Number.isFinite(value)) || !Number.isSafeInteger(metric.trades) || (metric.trades as number) < 0) return null;
  return {
    totalReturnPct: metric.totalReturnPct as number,
    buyAndHoldReturnPct: metric.buyAndHoldReturnPct as number,
    maxDrawdownPct: metric.maxDrawdownPct as number,
    trades: metric.trades as number,
    winRatePct: typeof metric.winRatePct === "number" && Number.isFinite(metric.winRatePct) ? metric.winRatePct : null,
    endingEquity: metric.endingEquity as number,
    equityCurve,
  };
}

function when(value: string | number) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unavailable" : `${date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" })} UTC`;
}

function pct(value: number | null) {
  return value === null ? "—" : `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function curvePath(points: MetricSummary["equityCurve"]) {
  if (points.length < 2) return "";
  const stride = Math.max(1, Math.ceil(points.length / 120));
  const sampled = points.filter((_, index) => index === 0 || index === points.length - 1 || index % stride === 0);
  const low = Math.min(...sampled.map(point => point.equity));
  const high = Math.max(...sampled.map(point => point.equity));
  const range = high - low || 1;
  return sampled.map((point, index) => `${index ? "L" : "M"}${(index / (sampled.length - 1)) * 1000},${12 + ((high - point.equity) / range) * 118}`).join(" ");
}

export default async function SavedStrategyRunPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  if (!UUID.test(runId)) notFound();
  const auth = await getServerAuthState();
  if (auth.errorCode) return <main className="saved-strategy-replay"><h1>Saved replay</h1><p role="alert">Sign-in could not be verified.</p></main>;
  if (!auth.user) redirect(`/login?next=${encodeURIComponent(`/strategies/runs/${runId}`)}`);

  const db = await createClient();
  const { data, error } = await db.from("strategy_backtest_runs").select("id,symbol,interval,strategy_key,parameters,train_metrics,test_metrics,data_start,data_end,candle_count,candles,created_at").eq("id", runId).eq("user_id", auth.user.id).maybeSingle();
  if (error || !data) notFound();

  const row = data as Record<string, unknown>;
  const parameters = object(row.parameters);
  const candles = Array.isArray(row.candles) ? row.candles as MarketCandle[] : [];
  const rawManifest = parameters.experimentManifest;
  const manifestValid = verifyBacktestExperimentManifest(rawManifest, candles);
  const manifest = manifestValid && backtestManifestMatchesRun(row, parameters, rawManifest) ? rawManifest : null;
  const train = metricSummary(row.train_metrics);
  const holdout = metricSummary(row.test_metrics);
  if (!train || !holdout || typeof row.symbol !== "string" || typeof row.interval !== "string" || typeof row.strategy_key !== "string") notFound();

  let metricsReproduced: boolean | null = null;
  if (manifest?.engine.version === BACKTEST_ENGINE_VERSION && Object.hasOwn(ALPHA_STRATEGIES, row.strategy_key)) {
    try {
      const reproduced = runBacktest(row.symbol, row.interval as "1H" | "4H" | "1D", candles, manifest.dataset.capturedAt, row.strategy_key as StrategyKey);
      metricsReproduced = backtestMetricsMatch(row.train_metrics, reproduced.train) && backtestMetricsMatch(row.test_metrics, reproduced.test);
    } catch { metricsReproduced = false; }
  }

  const researchRunId = typeof parameters.researchRunId === "string" && UUID.test(parameters.researchRunId) ? parameters.researchRunId : null;
  const assetName = typeof parameters.assetName === "string" ? parameters.assetName.slice(0, 160) : row.symbol;
  const assetKind = typeof parameters.assetKind === "string" ? parameters.assetKind.slice(0, 48) : "Unspecified instrument";
  const strategyLabel = ALPHA_STRATEGIES[row.strategy_key as StrategyKey]?.label ?? row.strategy_key;
  const path = curvePath(holdout.equityCurve);

  return <main className="saved-strategy-replay">
    <header><Link href="/strategies">← STRATEGY LAB</Link><span>PRIVATE SAVED REPLAY · {String(row.id).slice(0, 8).toUpperCase()}</span></header>
    <section className="saved-strategy-hero"><span>{!manifest ? "ARCHIVED RESULT · ASSUMPTIONS UNVERIFIED" : metricsReproduced === true ? "ARCHIVE AND METRICS REPRODUCED" : metricsReproduced === false ? "ARCHIVE VERIFIED · METRIC MISMATCH" : "ARCHIVE VERIFIED · ENGINE VERSION NOT CURRENT"}</span><h1>{assetName}<br/><em>{String(row.symbol)}</em></h1><p>This view uses only the archived candle set. It does not request new market data.</p>
      <div className="saved-strategy-facts"><span>Rule <b>{strategyLabel}</b></span><span>Interval <b>{String(row.interval)}</b></span><span>Instrument <b>{assetKind}</b></span><span>Archived candles <b>{candles.length} / {String(row.candle_count)}</b></span><span>Data window <b>{when(String(row.data_start))} – {when(String(row.data_end))}</b></span></div>
      {researchRunId ? <Link className="saved-strategy-context" href={`/decisions/${researchRunId}`}>Open linked Decision Record →</Link> : null}
    </section>
    <section className="saved-strategy-section"><span>OUT-OF-SAMPLE · AFTER ESTIMATED COSTS</span><h2>Holdout result</h2><div className="saved-strategy-metrics"><article><small>Strategy return</small><b>{pct(holdout.totalReturnPct)}</b></article><article><small>Buy and hold</small><b>{pct(holdout.buyAndHoldReturnPct)}</b></article><article><small>Maximum drawdown</small><b>{pct(-holdout.maxDrawdownPct)}</b></article><article><small>Trades · win rate</small><b>{holdout.trades} · {pct(holdout.winRatePct)}</b></article></div>{path ? <svg viewBox="0 0 1000 160" role="img" aria-label="Saved holdout equity curve"><line x1="0" x2="1000" y1="138" y2="138"/><path d={`${path} L1000,138 L0,138 Z`} className="fill"/><path d={path} className="line"/></svg> : <p>Equity curve unavailable.</p>}</section>
    <section className="saved-strategy-section"><span>REPRODUCIBILITY</span><h2>Saved assumptions</h2><div className="saved-strategy-facts"><span>Training return <b>{pct(train.totalReturnPct)}</b></span><span>Training baseline <b>{pct(train.buyAndHoldReturnPct)}</b></span><span>Initial equity <b>{manifest ? `$${manifest.execution.initialEquity.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : "Unavailable"}</b></span><span>Fee per side <b>{manifest ? `${manifest.execution.feeBpsPerSide} bps` : "Unavailable"}</b></span><span>Slippage per side <b>{manifest ? `${manifest.execution.slippageBpsPerSide} bps` : "Unavailable"}</b></span><span>Funding <b>{manifest?.execution.funding ?? "Unavailable"}</b></span><span>Provider observation <b>{manifest?.dataset.providerTimestamp ? when(manifest.dataset.providerTimestamp) : "Unavailable"}</b></span>{manifest ? <><span>Engine <b>{manifest.engine.version}</b></span><span>Dataset SHA-256 <b>{manifest.dataset.fingerprint.value}</b></span><span>Manifest SHA-256 <b>{manifest.integrity.manifestDigest}</b></span></> : <p>The stored candle archive did not verify against a supported experiment manifest. Treat these saved metrics as an unverified historical record.</p>}</div>
      {metricsReproduced === false ? <p className="saved-strategy-boundary">The archived candle set is intact, but the current calculation does not match the saved metrics. The stored result remains shown.</p> : metricsReproduced === null && manifest ? <p className="saved-strategy-boundary">The archived candle set is intact. This engine version cannot be rerun by the current evaluator; stored metrics remain shown.</p> : null}
      <p className="saved-strategy-boundary">Historical simulation only. Costs are estimates. Perpetual results exclude funding, margin, and liquidation unless the manifest states otherwise. No orders were placed.</p>
    </section>
  </main>;
}
