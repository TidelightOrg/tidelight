"use client";

import Image from "next/image";
import Link from "next/link";
import TidelightAnimatedMark from "@/app/ui/tidelight-animated-mark";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import MfaChallenge from "@/app/ui/mfa-challenge";
import PnlShareCard from "@/app/ui/pnl-share-card";
import AssetSearchPicker from "@/app/ui/asset-search-picker";
import NightwatchSchedules from "@/app/ui/nightwatch-schedules";
import { ALPHA_STRATEGIES, BACKTEST_STRATEGY, type StrategyKey } from "@/lib/backtest";

type Asset = { symbol: string; name: string; ticker: string | null; lastPrice: number; change24h: number | null; logoUrl: string | null };
type Run = { id: string; symbol: string; signal: string; outcome: string; reason: string; as_of: string; reference_price: number; fast_sma: number; slow_sma: number; created_at: string; snapshot?: { playbook?: { key: string; label: string }; agent?: { confidence: number; rationale: string; evidence?: string[]; risks?: string[]; invalidation?: string; horizon?: string } } };
type Order = { id: string; symbol: string; side: string; quantity: number; simulated_fill_price: number; notional: number; fee: number; realized_pnl: number | null; created_at: string };
type Position = { id: string; symbol: string; quantity: number; average_cost: number; opened_at: string; currentPrice: number | null; name: string; ticker: string | null; logoUrl: string | null };
type Mark = { t: number; c: number };
type NightwatchPreferences = { trigger_mode: "manual" | "every_check"; monitor_symbol: string | null; research_run_id: string | null; alert_on_signal: boolean; alert_on_fill: boolean; daily_summary: boolean; nightwatch_analysis: boolean; nightwatch_signals: boolean; nightwatch_fills: boolean; nightwatch_risks: boolean; nightwatch_research: boolean; nightwatch_daily_summary: boolean; playbook_key: StrategyKey };
type Alert = { id: string; kind: "analysis" | "signal" | "fill" | "summary"; title: string; body: string; read_at: string | null; created_at: string };
type PublicReplay = { url: string; expiresAt: string };

const usd = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
const price = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumSignificantDigits: 7 }).format(value);
const date = (value: string) => new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
const isUtcToday = (value: string) => new Date(value).toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10);

function MarketCurve({ marks }: { marks: Mark[] }) {
  if (marks.length < 2) return <div className="nw-curve-empty">Run a check to load the live Bitget candle trace.</div>;
  const values = marks.map((point) => point.c);
  const low = Math.min(...values); const high = Math.max(...values); const range = high - low || Math.max(high * 0.01, 0.000001);
  const points = values.map((value, index) => `${(index / (values.length - 1)) * 900},${145 - ((value - low) / range) * 112}`).join(" ");
  const positive = values.at(-1)! >= values[0];
  return <svg className="nw-market-curve" viewBox="0 0 900 190" role="img" aria-label="Completed Bitget four hour candle closes for selected market">
    {[32, 88, 144].map((y) => <line key={y} x1="0" x2="900" y1={y} y2={y} className="nw-gridline" />)}
    <defs><linearGradient id="nightwatch-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={positive ? "#79e6b2" : "#f19b89"} stopOpacity=".24"/><stop offset="1" stopColor={positive ? "#79e6b2" : "#f19b89"} stopOpacity="0"/></linearGradient></defs>
    <polygon points={`0,165 ${points} 900,165`} fill="url(#nightwatch-fill)" />
    <polyline points={points} fill="none" stroke={positive ? "#8ce9ba" : "#efaa92"} strokeWidth="2.7" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    <circle cx="900" cy={145 - ((values.at(-1)! - low) / range) * 112} r="4.5" fill={positive ? "#aaf1cb" : "#f5b6a2"} />
    <text x="0" y="185">{new Date(marks[0].t).toLocaleDateString()}</text><text x="900" y="185" textAnchor="end">{new Date(marks.at(-1)!.t).toLocaleDateString()}</text>
  </svg>;
}

function IssuerMark({ ticker, logoUrl }: { ticker: string | null; logoUrl: string | null }) {
  const [failed, setFailed] = useState(false);
  return <span className="nw-issuer-mark">{logoUrl && !failed ? <Image src={logoUrl} alt="" width={30} height={30} unoptimized onError={() => setFailed(true)} /> : <b>{(ticker ?? "R").slice(0, 1)}</b>}</span>;
}

function HistoryMoreButton({ id, total, visible, onClick }: { id: string; total: number; visible: number; onClick: () => void }) {
  if (total <= 5) return null;
  const showingAll = visible >= total;
  return <button type="button" className="nw-history-more" aria-controls={id} aria-expanded={visible > 5} onClick={onClick}>
    <span>{showingAll ? "Show latest 5" : "Show 5 more"}</span>
    <small>{Math.min(visible, total)} / {total}</small>
    <span aria-hidden="true">{showingAll ? "↑" : "↓"}</span>
  </button>;
}

export default function NightwatchDesk({ signedIn, assets, initialRuns, initialOrders, positions, cashBalance, paused, initialHistory, defaultSymbol, initialAlerts, researchRunId = null, initialPlaybookKey = null }: {
  signedIn: boolean; assets: Asset[]; initialRuns: Run[]; initialOrders: Order[]; positions: Position[];
  cashBalance: number; paused: boolean; initialHistory: Mark[]; defaultSymbol: string; initialAlerts: Alert[];
  researchRunId?: string | null; initialPlaybookKey?: StrategyKey | null;
}) {
  const router = useRouter();
  const [runs, setRuns] = useState(initialRuns);
  const [orders, setOrders] = useState(initialOrders);
  const [positionsState, setPositionsState] = useState(positions);
  const [cashState, setCashState] = useState(cashBalance);
  const [alertsState, setAlertsState] = useState(initialAlerts);
  const [publicReplays, setPublicReplays] = useState<Record<string, PublicReplay>>({});
  const [replayOrder, setReplayOrder] = useState<Order | null>(null);
  const [replayBusy, setReplayBusy] = useState(false);
  const [ledgerError, setLedgerError] = useState("");
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [history, setHistory] = useState(initialHistory);
  const [localRun, setLocalRun] = useState<Run | null>(null);
  const [running, setRunning] = useState(false);
  const [changing, setChanging] = useState(false);
  const [closing, setClosing] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(paused);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [view, setView] = useState<"decisions" | "orders">("decisions");
  const [preferences, setPreferences] = useState<NightwatchPreferences>({ trigger_mode: "manual", monitor_symbol: null, research_run_id: null, alert_on_signal: true, alert_on_fill: true, daily_summary: true, nightwatch_analysis: false, nightwatch_signals: false, nightwatch_fills: false, nightwatch_risks: false, nightwatch_research: false, nightwatch_daily_summary: false, playbook_key: initialPlaybookKey ?? BACKTEST_STRATEGY });
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [visibleAlerts, setVisibleAlerts] = useState(5);
  const [alertFilter, setAlertFilter] = useState<"all"|"unread"|"analysis"|"signal"|"fill"|"summary">("all");
  const [visibleDecisions, setVisibleDecisions] = useState(5);
  const [visibleFills, setVisibleFills] = useState(5);
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const selected = assets.find((asset) => asset.symbol === symbol);
  const allRuns = localRun ? [localRun, ...runs.filter((run) => run.id !== localRun.id)] : runs;
  const exportPaperEvidence = () => {
    const evidence = {
      schema_version: "tidelight.nightwatch-paper-evidence.v1",
      exported_at: new Date().toISOString(),
      privacy: "Private account data. This file is downloaded locally and is not uploaded by this action. Review and redact before sharing.",
      scope: { decisions_included: allRuns.length, paper_orders_included: orders.length, positions_included: positionsState.length, limit: "Only records currently loaded in this view are included; this is not a complete account archive." },
      decision_runs: allRuns,
      paper_orders: orders,
      open_positions: positionsState,
    };
    const blob = new Blob([JSON.stringify(evidence, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `tidelight-nightwatch-evidence-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const marketChange = selected?.change24h;
  const positionsValue = useMemo(() => positionsState.reduce((sum, item) => sum + item.quantity * (item.currentPrice ?? item.average_cost), 0), [positionsState]);
  const equity = cashState + positionsValue;
  const realizedToday = orders.filter((order) => isUtcToday(order.created_at)).reduce((sum, order) => sum + (order.realized_pnl ?? 0), 0);
  const decisionAudit = {
    total: allRuns.length,
    actioned: allRuns.filter(run => run.outcome === "executed").length,
    held: allRuns.filter(run => run.signal === "hold" || run.outcome === "held").length,
    blocked: allRuns.filter(run => run.outcome === "rejected" || run.outcome === "blocked").length,
    unavailable: allRuns.filter(run => run.snapshot?.agent?.confidence === 0).length,
  };
  const filteredAlerts = alertsState.filter((alert) => alertFilter === "all" || (alertFilter === "unread" ? !alert.read_at : alert.kind === alertFilter));

  const refreshLedger = useCallback(async () => {
    if (!signedIn) return;
    try {
      const [response, replayResponse] = await Promise.all([fetch("/api/nightwatch/state", { cache: "no-store" }), fetch("/api/nightwatch/replays", { cache: "no-store" })]);
      const payload = await response.json() as { error?: string; runs?: Run[]; orders?: Order[]; positions?: Array<Omit<Position, "currentPrice" | "name" | "ticker" | "logoUrl">>; alerts?: Alert[]; cashBalance?: number; paused?: boolean };
      if (!response.ok) throw new Error(payload.error ?? "Nightwatch ledger could not be refreshed.");
      setRuns(payload.runs ?? []);
      setOrders(payload.orders ?? []);
      setPositionsState((payload.positions ?? []).map((position) => {
        const asset = assets.find((item) => item.symbol === position.symbol);
        return { ...position, currentPrice: asset?.lastPrice ?? null, name: asset?.name ?? position.symbol, ticker: asset?.ticker ?? null, logoUrl: asset?.logoUrl ?? null };
      }));
      setAlertsState(payload.alerts ?? []);
      if (replayResponse.ok) {
        const shares = await replayResponse.json() as { replays?: Array<{ orderId: string; url: string; expiresAt: string; revoked: boolean; expired: boolean }> };
        setPublicReplays(Object.fromEntries((shares.replays ?? []).filter((share) => !share.revoked && !share.expired).map((share) => [share.orderId, { url: share.url, expiresAt: share.expiresAt }])));
      }
      if (typeof payload.cashBalance === "number") setCashState(payload.cashBalance);
      if (typeof payload.paused === "boolean") setIsPaused(payload.paused);
      setLedgerError("");
    } catch (cause) {
      setLedgerError(cause instanceof Error ? cause.message : "Nightwatch ledger could not be refreshed.");
    }
  }, [assets, signedIn]);

  async function publishTradeReplay(order: Order) {
    setReplayBusy(true); setError("");
    try {
      const response = await fetch("/api/nightwatch/replays", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: order.id }) });
      const payload = await response.json() as { url?: string; expiresAt?: string; error?: string };
      if (!response.ok || !payload.url || !payload.expiresAt) throw new Error(payload.error ?? "Could not publish this replay.");
      setPublicReplays((items) => ({ ...items, [order.id]: { url: payload.url!, expiresAt: payload.expiresAt! } }));
      setReplayOrder(null); setNotice("Replay published. The link is public for 30 days and excludes private account details.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not publish this replay."); }
    finally { setReplayBusy(false); }
  }

  async function revokeTradeReplay(orderId: string, url: string) {
    const token = url.split("/").at(-1);
    if (!token) return;
    const response = await fetch(`/api/nightwatch/replays/${encodeURIComponent(token)}`, { method: "DELETE" });
    const payload = await response.json() as { error?: string };
    if (!response.ok) { setError(payload.error ?? "Could not revoke this replay."); return; }
    setPublicReplays((items) => { const next = { ...items }; delete next[orderId]; return next; });
    setNotice("Public replay link revoked.");
  }

  useEffect(() => {
    if (!signedIn) return;
    const initialRefresh = window.setTimeout(() => { void refreshLedger(); }, 0);
    const interval = window.setInterval(() => { if (document.visibilityState === "visible") void refreshLedger(); }, 30_000);
    const onFocus = () => { if (document.visibilityState === "visible") void refreshLedger(); };
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    return () => { window.clearTimeout(initialRefresh); window.clearInterval(interval); document.removeEventListener("visibilitychange", onFocus); window.removeEventListener("focus", onFocus); };
  }, [refreshLedger, signedIn]);

  useEffect(() => {
    let cancelled = false;
    if (!symbol) return;
    void fetch(`/api/market/history?symbol=${encodeURIComponent(symbol)}`).then((response) => response.ok ? response.json() as Promise<{ candles?: Mark[] }> : null).then((payload) => { if (!cancelled && payload?.candles?.length) setHistory(payload.candles); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [symbol]);

  useEffect(() => { if (signedIn) void fetch("/api/nightwatch/preferences").then((response) => response.ok ? response.json() : null).then((data: (NightwatchPreferences & { scheduler_available?: boolean }) | null) => { if (data) { const loaded = initialPlaybookKey ? { ...data, playbook_key: initialPlaybookKey } : data; setPreferences(loaded); if (initialPlaybookKey && data.playbook_key !== initialPlaybookKey) void fetch("/api/nightwatch/preferences", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(loaded) }); } }).catch(() => undefined); }, [signedIn, initialPlaybookKey]);

  async function savePreferences(next: Partial<NightwatchPreferences>) {
    if (!signedIn) { router.push("/login"); return; }
    const updated = { ...preferences, ...next }; setPreferences(updated); setSavingPreferences(true);
    try { const response = await fetch("/api/nightwatch/preferences", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) }); if (!response.ok) { const payload = await response.json() as { error?: string }; setPreferences(preferences); setError(payload.error ?? "Could not save Nightwatch preferences."); } }
    catch { setPreferences(preferences); setError("Could not save Nightwatch preferences."); }
    finally { setSavingPreferences(false); }
  }

  async function markAlertRead(id?: string) {
    if (!signedIn) { router.push("/login"); return; }
    const response = await fetch("/api/nightwatch/alerts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(id ? { id } : { all: true }) });
    if (response.ok) setAlertsState((items) => items.map((item) => id && item.id !== id ? item : { ...item, read_at: new Date().toISOString() }));
  }

  async function generateSummary() {
    if (!signedIn) { router.push("/login"); return; }
    setSummaryBusy(true);
    try {
      const response = await fetch("/api/nightwatch/summary", { method: "POST" });
      const payload = await response.json() as { alert?: Alert; error?: string };
      if (response.ok && payload.alert) setAlertsState((items) => [payload.alert!, ...items.filter((item) => item.kind !== "summary")]);
      else setError(payload.error ?? "Could not generate the daily summary.");
    } finally { setSummaryBusy(false); }
  }

  async function runCheck() {
    if (!signedIn) { router.push("/login"); return; }
    setRunning(true); setError(""); setNotice(""); setLocalRun(null);
    try {
      const response = await fetch("/api/nightwatch/tick", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ symbol, researchRunId }) });
      const payload = await response.json() as { error?: string; signal?: string; fastSma?: number; slowSma?: number; asOf?: string; price?: number; decision?: { confidence:number; rationale:string; evidence:string[]; risks:string[]; invalidation:string; horizon:string }; history?: Mark[]; result?: { run_id: string; outcome: string; reason: string } };
      if (!response.ok || !payload.result) throw new Error(payload.error ?? "Market check could not complete.");
      setHistory(payload.history ?? []);
      setLocalRun({ id: payload.result.run_id, symbol, signal: payload.signal ?? "hold", outcome: payload.result.outcome, reason: payload.result.reason, as_of: payload.asOf ?? new Date().toISOString(), reference_price: payload.price ?? selected?.lastPrice ?? 0, fast_sma: payload.fastSma ?? 0, slow_sma: payload.slowSma ?? 0, created_at: new Date().toISOString(), snapshot: payload.decision ? { agent: payload.decision } : undefined });
      setNotice(payload.result.outcome === "executed" ? "Decision accepted and recorded in your paper ledger." : "Market snapshot checked and decision recorded.");
      void refreshLedger();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Nightwatch is temporarily unavailable."); }
    finally { setRunning(false); }
  }

  async function togglePause() {
    if (!signedIn) { router.push("/login"); return; }
    setChanging(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/nightwatch/control", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paused: !isPaused }) });
      const payload = await response.json() as { paused?: boolean; error?: string; code?: string };
      if (payload.code === "mfa_required") { setMfaRequired(true); setChanging(false); return; }
      if (!response.ok || typeof payload.paused !== "boolean") throw new Error(payload.error ?? "Could not update the agent state.");
      setIsPaused(payload.paused); setNotice(payload.paused ? "Paper agent paused. Checks will be recorded without fills." : "Paper agent resumed."); void refreshLedger();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update agent state."); }
    finally { setChanging(false); }
  }

  async function closePosition(position: Position) {
    if (!signedIn) { router.push("/login"); return; }
    setClosing(position.symbol); setError(""); setNotice("");
    try {
      const response = await fetch("/api/nightwatch/close", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ symbol: position.symbol, reason: "Manual paper exit from Nightwatch" }) });
      const payload = await response.json() as { error?: string; code?: string };
      if (payload.code === "mfa_required") { setMfaRequired(true); setClosing(null); return; }
      if (!response.ok) throw new Error(payload.error ?? "Could not close the paper position.");
      setNotice("Paper position closed and realized P&L recorded."); void refreshLedger();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not close the paper position."); }
    finally { setClosing(null); }
  }

  return <div className="content-wrap inner-page nightwatch-page">
    {mfaRequired ? <MfaChallenge onVerified={() => { setMfaRequired(false); setNotice("Authenticator verified. Retry the control you were changing."); }} /> : null}
    <section className="nw-hero">
      <div className="nw-hero-copy"><div className="eyebrow"><span className="eyebrow-line" /> NIGHTWATCH · PAPER MODE</div>
        <h1>Observe.<br/><span>Record. Review.</span></h1>
        <p>Review completed 4-hour candles, inspect each decision, and track simulated fills in a private ledger.</p>
        <div className="nw-hero-pills"><span><i className="nw-pulse"/> {isPaused ? "PAUSED" : "READY"}</span></div>
      </div>
      <div className="nw-orbit" aria-hidden="true"><div className="nw-orbit-ring ring-a"/><div className="nw-orbit-ring ring-b"/><div className="nw-orbit-core">N<span>W</span></div><div className="nw-orbit-chip chip-one">SMA <b>20 / 50</b></div><div className="nw-orbit-chip chip-two">MODE <b>PAPER</b></div><div className="nw-orbit-chip chip-three">BAR <b>4H</b></div></div>
      <div className="nw-hero-coast" aria-hidden="true"/>
    </section>

    <section className="nw-command-bar"><div className="nw-status-line"><span className={`nw-state-dot${isPaused ? " paused" : ""}`}/><div><b>{isPaused ? "Agent is paused" : "Paper agent is standing by"}</b><small>{signedIn ? "Private paper ledger" : "Sign in to create a paper account"}</small></div></div><div className="nw-command-actions"><button type="button" className="nw-secondary-button" onClick={() => void togglePause()} disabled={changing}>{changing ? "Updating…" : isPaused ? "Resume agent" : "Pause agent"}</button><Link href="/strategies" className="nw-inline-link">Strategy lab <span>↗</span></Link><Link href="/futures" className="nw-inline-link">Stock perpetual paper desk <span>↗</span></Link></div></section>
    <section className="nw-preferences">
      <div className="nw-preferences-intro">
        <h2>Review controls</h2>
        <p>Select the playbook for manual checks. Schedules can use their own settings.</p>
      </div>
      <div className="nw-preference-controls">
        <div className="nw-preference-plan">
          <div className="nw-cadence-note"><span>MANUAL CHECK</span><b>Completed 4H candle</b></div>
          <label className="nw-monitor-select">ALPHA FACTORY PLAYBOOK
            <select value={preferences.playbook_key} onChange={(event) => void savePreferences({ playbook_key: event.target.value as StrategyKey })} disabled={!signedIn || savingPreferences}>
              {Object.entries(ALPHA_STRATEGIES).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}
            </select>
            <small>{ALPHA_STRATEGIES[preferences.playbook_key].description}</small>
          </label>
        </div>
        <div className="nw-workspace-alerts"><span>ALERTS</span><Link href="/notifications?view=settings" className="nw-inline-link">Delivery settings ↗</Link></div>
        <button type="button" className="nw-summary-button" onClick={() => void generateSummary()} disabled={!signedIn || summaryBusy}>{summaryBusy ? "Preparing…" : "Create daily summary"}</button>
      </div>
    </section>

    <NightwatchSchedules signedIn={signedIn} assets={assets} symbol={symbol} playbookKey={preferences.playbook_key} researchRunId={researchRunId}/>

    {error ? <div className="strategy-error" role="alert">{error}</div> : null}{notice ? <div className="nw-notice" role="status"><span>✓</span>{notice}</div> : null}

    <section className="nw-kpi-grid" aria-label="Paper portfolio summary">
      <article className="nw-kpi nw-kpi-primary"><span>PAPER EQUITY</span><b>{usd(equity)}</b><small>Cash + current tokenized equity marks</small><i><TidelightAnimatedMark /></i></article>
      <article className="nw-kpi"><span>AVAILABLE CASH</span><b>{usd(cashState)}</b><small>Paper capital · start {usd(10000)}</small><i>$</i></article>
      <article className="nw-kpi"><span>OPEN EXPOSURE</span><b>{usd(positionsValue)}</b><small>{positionsState.length} open {positionsState.length === 1 ? "position" : "positions"}</small><i>⌁</i></article>
      <article className="nw-kpi"><span>REALIZED TODAY</span><b className={realizedToday < 0 ? "nw-negative" : ""}>{usd(realizedToday)}</b><small>Daily stop at −$200 · UTC day</small><i>↗</i></article>
    </section>

    <div className="nw-main-grid">
      <section className="nw-panel nw-market-panel">
        <div className="nw-panel-head"><div><span className="eyebrow small-eyebrow">BITGET REALITY</span><h2>Market review</h2></div><span className="nw-source-badge"><i/> 4H</span></div>
        <div className="nw-market-select-row"><AssetSearchPicker label="MONITOR A TOKENIZED EQUITY" assets={assets} value={symbol} onChange={(nextSymbol) => setSymbol(nextSymbol)} disabled={!assets.length}/>
          <div className="nw-current-price"><span>{selected?.ticker ?? "MARKET"}</span><b>{selected ? price(selected.lastPrice) : "—"}</b><small className={(marketChange ?? 0) >= 0 ? "positive" : "negative"}>{marketChange == null ? "change unavailable" : `${marketChange >= 0 ? "+" : ""}${(marketChange * 100).toFixed(2)}% today`}</small></div>
        </div>
        <div className="nw-chart-wrap"><div className="nw-chart-label"><span>COMPLETED CLOSES</span><span>LAST 90 · 4H</span></div><MarketCurve marks={history}/></div>
        <div className="nw-rules-strip"><div><span>ENTRY</span><b>Agent confidence ≥ 66%</b></div><div><span>EXIT</span><b>Sell only to close an open paper position</b></div><div><span>MARKET GATE</span><b>Reality token only · no live orders</b></div></div>
        <button className="nw-run-button" type="button" onClick={() => void runCheck()} disabled={running || !assets.length}>{running ? <><span className="strategy-spinner"/> Reading Bitget candles…</> : <>Run completed-candle check <span>↗</span></>}</button>
        <p className="nw-run-caption">Uses the last completed 4-hour bar. Re-running the same bar is idempotent.</p>
      </section>

      <section className="nw-panel nw-risk-panel">
        <div className="nw-panel-head"><div><h2>Risk controls</h2></div><div className="nw-shield">⌑</div></div>
        <details className="nw-risk-details"><summary className="nw-risk-summary"><div className="nw-risk-emblem"><span>✓</span></div><div><b>Five checks</b><small>Applied before every fill</small></div><span className="nw-risk-on">ACTIVE</span></summary>
          <ul className="nw-risk-list"><li><span>01</span><b>Asset eligibility</b><small>Verified Bitget Reality instrument</small><i>✓</i></li><li><span>02</span><b>Feed freshness</b><small>Completed candle less than 6 hours old</small><i>✓</i></li><li><span>03</span><b>Position sizing</b><small>Maximum $500 per entry · long only</small><i>✓</i></li><li><span>04</span><b>Daily circuit breaker</b><small>$200 realized loss or 5 fills per day</small><i>✓</i></li><li><span>05</span><b>Pause + duplicate lock</b><small>Owner control · one decision per candle</small><i>✓</i></li></ul>
        </details>
        <div className="nw-cost-note"><span>SIMULATED COSTS</span><b>0.10% fee <i>+</i> 0.05% slippage per side</b></div>
      </section>
    </div>

    {ledgerError ? <div className="nw-notice" role="status">Ledger refresh failed: {ledgerError}</div> : null}
    <section className="nw-panel nw-positions-panel"><div className="nw-panel-head"><div><h2>Open positions <span className="nw-count">{positionsState.length}</span></h2></div>{!signedIn ? <span className="nw-account-tag">PREVIEW MODE</span> : null}</div>
      {positionsState.length ? <div className="nw-position-table"><div className="nw-table-head"><span>MARKET</span><span>SIZE</span><span>AVERAGE COST</span><span>LAST MARK</span><span>OPEN P&amp;L*</span><span>ACTION</span></div>{positionsState.map((item) => { const mark = item.currentPrice; const pnl = mark == null ? null : (mark - item.average_cost) * item.quantity; const ticker = item.ticker ?? item.symbol.replace("USDT", ""); return <div className="nw-position-row" key={item.id}><span className="nw-position-market"><IssuerMark ticker={item.ticker} logoUrl={item.logoUrl}/><span><b>{ticker}</b><small>{item.name} · {item.symbol}</small></span></span><b>{item.quantity.toLocaleString(undefined, { maximumFractionDigits: 6 })}</b><b>{price(item.average_cost)}</b><b>{mark == null ? "—" : price(mark)}</b><b className={pnl == null ? "" : pnl >= 0 ? "positive" : "negative"}>{pnl == null ? "Unavailable" : `${pnl >= 0 ? "+" : ""}${usd(pnl)}`}</b><span className="nw-position-actions"><PnlShareCard details={{ ticker, name: item.name, symbol: item.symbol, direction: "LONG", status: "OPEN", pnl, pnlPercent: mark == null ? null : (pnl! / (item.average_cost * item.quantity)) * 100, quantity: item.quantity, entryPrice: item.average_cost, referencePrice: mark, referenceLabel: "LAST MARK", timestamp: item.opened_at, desk: "NIGHTWATCH" }}/><button type="button" className="nw-close-position" onClick={() => void closePosition(item)} disabled={closing === item.symbol}>{closing === item.symbol ? "Closing…" : "Close paper"}</button></span></div>; })}</div> : <div className="nw-empty-book"><span><TidelightAnimatedMark /></span><div><b>No positions open</b></div></div>}
      <p className="nw-footnote">* Open P&amp;L is an estimate before exit fees/slippage. Open positions are marked with the latest public Bitget quote.</p>
    </section>

    <section className="nw-panel nw-alerts-panel">
      <div className="nw-panel-head">
        <div><h2>Activity</h2></div>
        <div className="nw-alert-actions"><span className="nw-count">{alertsState.filter((alert) => !alert.read_at).length} unread</span>{alertsState.some((alert) => !alert.read_at) ? <button type="button" onClick={() => void markAlertRead()} disabled={!signedIn}>Mark all read</button> : null}</div>
      </div>
      {alertsState.length ? <>
        <div className="nw-alert-filters" role="group" aria-label="Filter Nightwatch alerts">{([ ["all","All"],["unread","Unread"],["analysis","Analyses"],["signal","Signals"],["fill","Paper fills"],["summary","Summaries"] ] as const).map(([key,label])=><button type="button" key={key} aria-pressed={alertFilter===key} onClick={()=>{setAlertFilter(key);setVisibleAlerts(5);}}>{label}{key==="unread"?<span>{alertsState.filter(a=>!a.read_at).length}</span>:null}</button>)}</div>
        {filteredAlerts.length?<><div className="nw-alert-list" id="nightwatch-alert-history">{filteredAlerts.slice(0, visibleAlerts).map((alert) => <article className={`nw-alert ${alert.kind}${alert.read_at ? " read" : ""}`} key={alert.id}><span>{alert.kind === "fill" ? "↗" : alert.kind === "summary" ? "≋" : "!"}</span><div><b>{alert.title}</b><p>{alert.body}</p><small>{date(alert.created_at)}{alert.read_at ? " · read" : " · new"}</small></div>{!alert.read_at ? <button type="button" aria-label={`Mark ${alert.title} as read`} onClick={() => void markAlertRead(alert.id)} disabled={!signedIn}>✓</button> : null}</article>)}</div>
          <HistoryMoreButton id="nightwatch-alert-history" total={filteredAlerts.length} visible={visibleAlerts} onClick={() => setVisibleAlerts((count) => count >= filteredAlerts.length ? 5 : Math.min(count + 5, filteredAlerts.length))}/></>:<div className="nw-empty-activity"><span>✓</span><div><b>No {alertFilter === "unread" ? "unread " : "matching "}alerts.</b><small>Switch the filter to review another part of the Nightwatch stream.</small></div></div>}
      </> : <div className="nw-empty-activity"><span>!</span><div><b>No alerts yet.</b><small>Signal and paper-fill alerts will appear here after a completed-candle check.</small></div></div>}
    </section>

    <section className="nw-panel nw-activity-panel">
      <div className="nw-panel-head"><div><h2>Decision history</h2></div><div className="nw-audit-actions">{signedIn ? <button type="button" className="nw-export-button" onClick={exportPaperEvidence} disabled={!allRuns.length && !orders.length && !positionsState.length}>Export evidence ↓</button> : null}<div className="nw-tabs"><button type="button" className={view === "decisions" ? "active" : ""} onClick={() => setView("decisions")}>Decisions <span>{allRuns.length}</span></button><button type="button" className={view === "orders" ? "active" : ""} onClick={() => setView("orders")}>Paper fills <span>{orders.length}</span></button></div></div></div>
      {signedIn ? <div className="nw-decision-audit" aria-label="Recent agent decision review"><div><span>REVIEWED</span><b>{decisionAudit.total}</b></div><div><span>FILLED</span><b>{decisionAudit.actioned}</b></div><div><span>HELD</span><b>{decisionAudit.held}</b></div><div><span>BLOCKED</span><b>{decisionAudit.blocked}</b></div><div><span>AI UNAVAILABLE</span><b>{decisionAudit.unavailable}</b></div><small>Latest {runs.length} saved checks{localRun ? " + current check" : ""}.</small></div> : null}
      {view === "decisions" ? (allRuns.length ? <>
        <div className="nw-event-list" id="nightwatch-decision-history">{allRuns.slice(0, visibleDecisions).map((run) => <article className="nw-event" key={run.id}><span className={`nw-event-icon ${run.outcome}`}>{run.outcome === "executed" ? "↗" : run.outcome === "rejected" ? "⊘" : "·"}</span><div className="nw-event-copy"><div><b>{run.signal.toUpperCase()} · {run.symbol}</b><span className={`nw-outcome ${run.outcome}`}>{run.outcome.replace("_", " ")}</span></div>{run.snapshot?.playbook?.label ? <small className="nw-agent-evidence">Alpha Factory · {run.snapshot.playbook.label}</small> : null}<p>{run.snapshot?.agent?.rationale ?? run.reason}</p>{run.snapshot?.agent?.evidence?.length ? <small className="nw-agent-evidence">Observed: {run.snapshot.agent.evidence.join(" · ")}</small> : null}<small>{date(run.as_of)} · reference {price(Number(run.reference_price))}{run.snapshot?.agent ? " · AI confidence " + Math.round(run.snapshot.agent.confidence * 100) + "%" : " · legacy rule snapshot"}</small></div><span className="nw-event-sma">{run.snapshot?.agent ? "AGENT CONFIDENCE" : "SMA REFERENCE"}<br/><b>{run.snapshot?.agent ? Math.round(run.snapshot.agent.confidence * 100) + "%" : Number(run.fast_sma).toPrecision(5) + " / " + Number(run.slow_sma).toPrecision(5)}</b></span></article>)}</div>
        <HistoryMoreButton id="nightwatch-decision-history" total={allRuns.length} visible={visibleDecisions} onClick={() => setVisibleDecisions((count) => count >= allRuns.length ? 5 : Math.min(count + 5, allRuns.length))}/>
      </> : <div className="nw-empty-activity"><span>◎</span><div><b>The ledger is ready</b><small>Run a review to record a decision. Paper fills appear here when the risk gates pass.</small></div></div>) : (orders.length ? <>
        <div className="nw-event-list" id="nightwatch-fill-history">{orders.slice(0, visibleFills).map((order) => { const ticker = order.symbol.replace("USDT", ""); const shared = publicReplays[order.id]; return <article className="nw-event" key={order.id}><span className={`nw-event-icon ${order.side}`}>{order.side === "buy" ? "↗" : "↙"}</span><div className="nw-event-copy"><div><b>PAPER {order.side.toUpperCase()} · {order.symbol}</b><span className="nw-outcome executed">filled</span></div><p>{Number(order.quantity).toLocaleString(undefined, { maximumFractionDigits: 6 })} units at {price(Number(order.simulated_fill_price))} · {usd(Number(order.notional))} notional · {usd(Number(order.fee))} fee</p><small>{date(order.created_at)} · simulated; no exchange order</small><div className="nw-replay-actions">{shared ? <><Link href={shared.url}>Public replay ↗</Link><button type="button" onClick={() => void revokeTradeReplay(order.id, shared.url)}>Revoke link</button><small>Expires {date(shared.expiresAt)}</small></> : <button type="button" onClick={() => setReplayOrder(order)}>Publish replay</button>}</div></div>{order.realized_pnl != null ? <><b className={`nw-order-pnl ${order.realized_pnl >= 0 ? "positive" : "negative"}`}>{usd(Number(order.realized_pnl))}</b><PnlShareCard details={{ ticker, symbol: order.symbol, direction: order.side === "sell" ? "LONG" : "SHORT", status: "CLOSED", pnl: Number(order.realized_pnl), quantity: Number(order.quantity), referencePrice: Number(order.simulated_fill_price), referenceLabel: "EXIT FILL", timestamp: order.created_at, desk: "NIGHTWATCH" }}/></> : <span className="nw-open-label">POSITION OPEN</span>}</article>; })}</div>
        <HistoryMoreButton id="nightwatch-fill-history" total={orders.length} visible={visibleFills} onClick={() => setVisibleFills((count) => count >= orders.length ? 5 : Math.min(count + 5, orders.length))}/>
      </> : <div className="nw-empty-activity"><span><TidelightAnimatedMark /></span><div><b>No paper fills yet.</b><small>HOLD or blocked decisions stay in the audit trail. The paper ledger fills only when the agent acts and every database guardrail passes.</small></div></div>)}
    </section>

    {replayOrder ? <div className="nw-replay-backdrop"><section className="nw-replay-dialog" role="dialog" aria-modal="true" aria-labelledby="nw-replay-title"><button type="button" className="nw-replay-close" onClick={() => setReplayOrder(null)} aria-label="Close replay publishing dialog">×</button><span className="eyebrow small-eyebrow">PUBLIC TRADE REPLAY</span><h2 id="nw-replay-title">Publish {replayOrder.symbol} paper fill?</h2><p>The replay is public for 30 days and will appear in the Nightwatch replay directory linked from Judge Mode and the repository README. It includes this fill’s market, size, simulated prices and costs, plus its recorded decision context. Your identity, account balance, and other ledger rows are excluded. Anyone can open and share the listing; you can revoke the replay from this page.</p><div className="nw-replay-dialog-actions"><button type="button" onClick={() => setReplayOrder(null)}>Cancel</button><button type="button" onClick={() => void publishTradeReplay(replayOrder)} disabled={replayBusy}>{replayBusy ? "Publishing…" : "Publish public replay"}</button></div></section></div> : null}

    <section className="nw-method-footer"><div><details><summary>Method &amp; assumptions</summary><p>Nightwatch reviews completed Bitget 4-hour candles, portfolio state, and linked research. It records rationale, evidence, risks, invalidation, and model confidence. Database checks enforce the 0.66 confidence threshold, $10,000 sandbox, $500 entry cap, $200 daily loss circuit, five-fill daily limit, 0.10% fee, and 0.05% adverse slippage per side.</p></details></div><div className="nw-method-actions"><Link href="/strategies">Strategy Lab <span>↗</span></Link><Link href="/markets">Reality listings <span>↗</span></Link></div></section>
    <div className="route-footnote nw-disclaimer"><span>i</span> This is a research simulation. It does not place exchange orders, hold assets, or predict future returns. Tokenized assets may have distinct market hours, liquidity and issuer terms.</div>
    {!signedIn ? <div className="sign-in-panel strategy-signin"><div className="empty-glyph">◉</div><div><span className="eyebrow small-eyebrow">MAKE THE PAPER BOOK YOURS</span><h2>Sign in to save a private audit and paper ledger.</h2><p>The market view is public. Account controls and run history are private to your sign-in.</p><Link className="primary-link" href="/login">Sign in <span>↗</span></Link></div></div> : null}
  </div>;
}
