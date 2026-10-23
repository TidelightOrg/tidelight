"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useExperience } from "@/app/ui/theme-provider";
import ResearchReplayShare from "@/app/ui/research-replay-share";

type StageEvent = { id: string; agent: string; status: "running" | "complete" | "blocked"; title: string; detail: string; at: string; asset?: string };
type Destination = { mode: "paper_futures" | "live_spot"; label: string; href: string };
type AssetRead = {
  ticker: string; issuer: string; summary: string; stance: "bullish" | "bearish" | "mixed" | "unclear";
  confidence: number; confidenceCapped?: boolean; tradeable: boolean; gateReasons: string[]; tokenizedMarketReview?: { verdict: string; quoteStatus: "unavailable" | "unverified" | "fresh" | "stale"; limitations: string[] };
  evidenceBalance?: { supporting: Array<{ text: string; citedUrls: string[] }>; counter: Array<{ text: string; citedUrls: string[] }> };
  sources: Array<{ title: string; url: string; publisher: string; publishedAt: string | null; via?: "Public feeds" | "AgentKey" }>;
  market: { perpSymbol: string | null; spotSymbol: string | null; lastPrice: number | null; providerTimestamp?: number | null; perpLastPrice?: number | null; perpProviderTimestamp?: number | null; spotLastPrice?: number | null; spotProviderTimestamp?: number | null };
  handoff: { destinations: Destination[]; reason: string } | null;
};
type FlowResult = { researchRunId?: string; question: string; assets: AssetRead[]; tradeable: boolean; handoff?: unknown; trace: StageEvent[]; researchCoverage?: { mode: string; lookbackDays: number; queriesPerTicker: number; collectedItems: number; publishers: number; sourceDomains: number; collectedAt: string; limitations: string[] } };

const EXAMPLES = ["What do you think about NVDA and TSLA?", "Compare Apple and Microsoft after the latest news", "Is the rNVDA market worth reviewing?"];

function QuoteFreshness({ market, now }: { market: AssetRead["market"]; now: number }) {
  const timestamp = market.providerTimestamp;
  const known = typeof timestamp === "number" && Number.isFinite(timestamp) && timestamp > 0 && timestamp <= now + 60_000;
  const fresh = known && now - timestamp <= 120_000;
  return <div className={`flow-quote ${fresh ? "flow-quote-fresh" : "flow-quote-stale"}`}>
    <b>{fresh ? "Within the 2-minute quote window" : known ? "Quote outside the 2-minute window" : "Quote freshness unverified"}</b>
    {known ? <span>Provider quote as of <time dateTime={new Date(timestamp).toISOString()}>{new Date(timestamp).toLocaleString([], { dateStyle: "medium", timeStyle: "medium" })}</time> (your local time)</span> : <span>No usable provider timestamp was returned.</span>}
    <span>Stock perpetual reference · {market.perpSymbol || "Unavailable"} · Snapshot from this research run; prices do not update here.</span>
  </div>;
}

function safeDeskLink(destination: Destination) {
  try {
    const url = new URL(destination.href, "https://tidelight.local");
    if (url.origin !== "https://tidelight.local") return null;
    if (destination.mode === "paper_futures" && url.pathname === "/futures") return url.pathname + url.search;
    if (destination.mode === "live_spot" && url.pathname === "/trading") return url.pathname + url.search;
  } catch { /* A malformed destination is never rendered. */ }
  return null;
}

export default function AgentFlowDesk({ initialQuestion, evaluatorMode = false }: { initialQuestion: string; evaluatorMode?: boolean }) {
  const { mode, setMode } = useExperience();
  const [question, setQuestion] = useState(initialQuestion);
  const [stages, setStages] = useState<StageEvent[]>([]);
  const [result, setResult] = useState<FlowResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [busySince, setBusySince] = useState<number | null>(null);
  const [busySeconds, setBusySeconds] = useState(0);
  const [quoteNow, setQuoteNow] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const handoffRef = useRef<HTMLDivElement>(null);
  const tradeableAssets = result?.assets.filter((asset) => asset.tradeable && asset.handoff?.destinations.length) ?? [];

  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!busy || busySince === null) return;
    const update = () => setBusySeconds(Math.max(0, Math.floor((Date.now() - busySince) / 1000)));
    update();
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, [busy, busySince]);
  useEffect(() => {
    if (!result) return;
    const timer = window.setInterval(() => setQuoteNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [result]);
  useEffect(() => {
    if (!result || !tradeableAssets.length) return;
    const timer = window.setTimeout(() => {
      handoffRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "center" });
      handoffRef.current?.focus({ preventScroll: true });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [result, tradeableAssets.length]);

  async function runFlow(event?: FormEvent) {
    event?.preventDefault();
    const submitted = question.trim();
    if (submitted.length < 4) { setError("Ask a question about a US stock or its tokenized market."); return; }
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setBusy(true); setBusySince(Date.now()); setBusySeconds(0); setError(""); setResult(null); setStages([]);
    let completed = false;
    try {
      const response = await fetch("/api/research/agent-flow", {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ question: submitted }), signal: request.signal,
      });
      if (!response.ok || !response.body) {
        const failure = await response.json().catch(() => null);
        throw new Error(failure?.error || "The research flow could not start. Please try again.");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      function receive(block: string) {
        const kind = block.match(/^event:\s*(.+)$/m)?.[1]?.trim();
        const payload = block.split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trimStart()).join("\n");
        if (!kind || !payload) return;
        const data = JSON.parse(payload);
        if (kind === "stage") {
          const stage = data as StageEvent;
          if (!stage.id || !stage.title) return;
          setStages((previous) => {
            const index = previous.findIndex((item) => item.id === stage.id);
            if (index < 0) return [...previous, stage];
            return previous.map((item, i) => i === index ? stage : item);
          });
        } else if (kind === "result") {
          completed = true;
          setQuoteNow(Date.now());
          setResult(data as FlowResult);
        } else if (kind === "error") {
          throw new Error(data.error || "The research flow stopped before completion.");
        }
      }
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        buffer = buffer.replace(/\r\n/g, "\n");
        let boundary = buffer.indexOf("\n\n");
        while (boundary !== -1) {
          receive(buffer.slice(0, boundary));
          buffer = buffer.slice(boundary + 2);
          boundary = buffer.indexOf("\n\n");
        }
      }
      buffer += decoder.decode().replace(/\r\n/g, "\n");
      if (buffer.trim()) receive(buffer);
      if (!completed) throw new Error("The connection ended before the research was complete. Please retry.");
    } catch (cause) {
      if (!request.signal.aborted) setError(cause instanceof Error ? cause.message : "The research flow could not finish.");
    } finally {
      if (controller.current === request) { controller.current = null; setBusy(false); setBusySince(null); }
    }
  }

  return <div className="content-wrap inner-page agent-flow-page">
    {evaluatorMode ? <section className="flow-evaluator" aria-label="Evaluator guide">
      <div><span className="flow-kicker">TIDELIGHT / EVALUATOR VIEW</span><h2>Follow one real question through the gates.</h2><p>This guided run uses the same source-bound workflow as the workspace. Watch the evidence, quote freshness, and confidence gate; a review link appears only when the result qualifies.</p></div>
      <ol><li><b>Evidence</b><span>Source links and captured publishers</span></li><li><b>Exposure</b><span>Reality instrument and quote timestamp</span></li><li><b>Decision</b><span>Confidence and risk gates stay visible</span></li></ol>
    </section> : null}
    <section className="flow-hero" aria-labelledby="flow-title">
      <div className="flow-hero-copy"><span className="flow-kicker"><i /> TIDELIGHT / CONNECTED RESEARCH</span>
        <h1 id="flow-title">Ask once.<br /><span>Follow every step.</span></h1>
        <p>Bring a question about a company or its tokenized market. Tidelight separates issuer news from instrument-specific evidence, checks market context, and explains what the research can—and cannot—support.</p>
        <form className="flow-form" onSubmit={runFlow}><label htmlFor="flow-question">Your market question <span className="flow-depth-badge">DEEP RESEARCH · UP TO 30 DAYS</span></label><div className="flow-form-row"><textarea id="flow-question" value={question} maxLength={280} rows={2} onChange={(event) => setQuestion(event.target.value)} placeholder="What do you think about NVDA and TSLA?" disabled={busy} /><button type="submit" disabled={busy}>{busy ? "Following the evidence…" : "Begin research ↗"}</button></div></form>
        <div className="flow-prompts"><span>TRY A QUESTION</span>{EXAMPLES.map((example) => <button type="button" key={example} onClick={() => setQuestion(example)} disabled={busy}>{example}</button>)}</div>
        <ResearchReplayShare researchRunId={result?.researchRunId} />
      </div>
      <div className="flow-orbit" aria-hidden="true"><div className="flow-orbit-ring"><span>EVENT</span><span>EVIDENCE</span><span>EXPOSURE</span><span>DECISION</span></div><div className="flow-orbit-core"><Image src="/tidelight-mark.svg" alt="" width={42} height={42} /><small>TIDELIGHT</small></div></div>
    </section>

    {(busy || stages.length > 0) ? <section className="flow-glass" aria-label="Research activity" aria-busy={busy}><div className="flow-section-head"><div><h2>Research activity</h2></div><span className={`flow-state ${busy ? "flow-state-live" : ""}`}>{busy ? "RUNNING" : error ? "PAUSED" : "COMPLETE"}</span></div>
      <div className="flow-trace" aria-label="Research checkpoints" aria-live="polite" aria-relevant="additions text" role="list">{stages.map((stage, index) => {
        const effectiveStatus = stage.status === "running" && !busy ? error ? "blocked" : "complete" : stage.status;
        const statusLabel = effectiveStatus === "running" ? "In progress" : effectiveStatus === "blocked" ? "On hold" : "Complete";
        return <details className={`flow-stage flow-stage-${effectiveStatus}`} key={stage.id} role="listitem" aria-current={effectiveStatus === "running" ? "step" : undefined} open={effectiveStatus === "running"}>
          <summary className="flow-stage-summary">
            <span className="flow-stage-node" aria-hidden="true">{effectiveStatus === "complete" ? "✓" : effectiveStatus === "blocked" ? "!" : String(index + 1).padStart(2, "0")}</span>
            <span className="flow-stage-body"><span className="flow-stage-meta"><span>{stage.agent}{stage.asset ? ` · ${stage.asset}` : ""}</span><time>{stage.at ? new Date(stage.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</time></span><span className="flow-stage-title">{stage.title}</span></span>
            <span className="flow-stage-status">{statusLabel}</span>
            <span className="flow-stage-chevron" aria-hidden="true">⌄</span>
          </summary>
          <p className="flow-stage-detail">{stage.detail}</p>
        </details>;
      })}{busy && stages.length === 0 ? <div className="flow-wait" role="listitem"><i aria-hidden="true" /><span>{busySeconds < 8 ? "Opening the research path…" : "Connecting market and evidence sources"}{busySeconds >= 15 ? <small>Tidelight is checking current coverage and verified market data. Progress appears here as each check completes.</small> : <small>Market context · eight news searches per company · corroboration and counter-evidence · market and risk gates</small>}</span><time dateTime={`PT${busySeconds}S`}>{busySeconds}s</time></div> : null}{busy && stages.length > 0 && busySeconds >= 15 ? <div className="flow-progress-note" role="listitem"><p role="status">Research is still running. Search, source validation and synthesis may take up to two minutes.</p></div> : null}</div>
    </section> : null}

    {error ? <div className="flow-error" role="alert"><b>Research paused</b><span>{error}</span>{error.toLowerCase().includes("sign in") ? <Link href="/login">Sign in ↗</Link> : <button type="button" onClick={() => void runFlow()} disabled={busy}>Try again ↗</button>}</div> : null}

    {result ? <section className="flow-results" aria-label="Research findings"><div className="flow-section-head"><div><span className="flow-kicker">RESEARCH / {result.assets.length} {result.assets.length === 1 ? "ISSUER" : "ISSUERS"}</span><h2>One question. Separate decisions.</h2><p>Issuer coverage and token-market conditions are shown separately. Review the source links and quote timestamp before considering any next step.</p></div></div>
      <div className="flow-asset-grid">{result.assets.map((asset) => <article key={asset.ticker} className="flow-asset-card"><header><div><span className="flow-kicker">{asset.ticker} / {asset.issuer}</span><h3>{asset.issuer}</h3></div><span className={`flow-verdict ${asset.tradeable ? "flow-verdict-ready" : ""}`}>{asset.tradeable ? "REVIEW AVAILABLE" : "NO TRADE HANDOFF"}</span></header><p>{asset.summary}</p>{asset.tokenizedMarketReview ? <section className="flow-token-verdict" aria-label="Tokenized market finding"><span className="flow-kicker">R TOKEN / MARKET FINDING</span><b>{asset.tokenizedMarketReview.verdict}</b><span className={`flow-token-quote flow-token-quote-${asset.tokenizedMarketReview.quoteStatus}`}>Token quote freshness: {asset.tokenizedMarketReview.quoteStatus}</span><ul>{asset.tokenizedMarketReview.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul></section> : null}<div className="flow-asset-meta"><span>Read <b>{asset.stance}</b></span><span>Model confidence <b>{Math.round(asset.confidence * 100)}%</b></span></div><section className="flow-market-references" aria-label={`${asset.ticker} instrument checks`}><b>Instrument checks</b><span>Tokenized spot · {asset.market.spotSymbol ?? `R${asset.ticker}USDT`} · {asset.market.spotLastPrice != null ? `$${asset.market.spotLastPrice.toLocaleString()}` : "No verified quote"}{asset.market.spotProviderTimestamp ? ` · ${new Date(asset.market.spotProviderTimestamp).toLocaleString()}` : " · freshness unverified"}</span><span>Stock perpetual · {asset.market.perpSymbol ?? `${asset.ticker}USDT`} · {asset.market.perpLastPrice != null ? `$${asset.market.perpLastPrice.toLocaleString()}` : "No verified quote"}{asset.market.perpProviderTimestamp ? ` · ${new Date(asset.market.perpProviderTimestamp).toLocaleString()}` : " · freshness unverified"} · derivative reference</span></section><p className="flow-confidence-note" role="note">{asset.confidenceCapped ? "Evidence is limited: the score is capped until two recent, distinct publishers support the assessment. " : ""}Model-reported score, not a calibrated probability.</p><QuoteFreshness market={asset.market} now={quoteNow} />{asset.evidenceBalance && (asset.evidenceBalance.supporting.length > 0 || asset.evidenceBalance.counter.length > 0) ? <section className="flow-evidence-balance" aria-label={`${asset.ticker} evidence balance`}><header><b>Evidence balance</b><span>Source-linked points only</span></header><div className="flow-evidence-columns">{([["Supports this reading", asset.evidenceBalance.supporting], ["Challenges this reading", asset.evidenceBalance.counter]] as const).map(([label, points]) => <section className="flow-evidence-side" key={label}><h4>{label}</h4>{points.length ? <ul>{points.map((point, index) => <li key={index}><p>{point.text}</p><div>{point.citedUrls.map((url) => { const source = asset.sources.find((item) => item.url === url); return source ? <a key={url} href={url} target="_blank" rel="noopener noreferrer">{source.publisher} ↗</a> : null; })}</div></li>)}</ul> : <p className="flow-evidence-empty">No source-linked points were established for this side.</p>}</section>)}</div></section> : null}{asset.gateReasons?.length ? <div className="flow-gates"><b>Decision gates</b><ul>{asset.gateReasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul></div> : null}<details className="flow-sources"><summary>Inspect {asset.sources.length} {asset.sources.length === 1 ? "source" : "sources"}</summary>{asset.sources.length ? <ul>{asset.sources.map((source, index) => <li key={`${source.url}-${index}`}><span>{source.publisher}{source.publishedAt ? ` · ${new Date(source.publishedAt).toLocaleDateString()}` : ""}{source.via ? <em className="flow-source-via"> · {source.via}</em> : null}</span><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title} ↗</a></li>)}</ul> : <p>No source links were returned; the trading gate remains closed.</p>}</details></article>)}</div>
      {tradeableAssets.length ? <div className="flow-handoff" ref={handoffRef} tabIndex={-1} role="region" aria-label="Choose a trading review desk"><div className="flow-handoff-intro"><span className="flow-kicker">NEXT / YOUR DECISION</span><h2>Review the market before acting.</h2><p>The research gates found a scenario worth inspecting. Choose paper futures, or review a Bitget tokenized stock spot order in demo or live account mode. You can review both desks. Every order still requires your own approval and risk checks.</p></div><div className="flow-handoff-list">{tradeableAssets.map((asset) => <div className="flow-handoff-asset" key={asset.ticker}><div><b>{asset.ticker}</b><span>{asset.handoff?.reason}</span></div><div className="flow-handoff-actions">{asset.handoff?.destinations.flatMap((destination) => { const href = safeDeskLink(destination); if (!href) return []; if (destination.mode === "paper_futures") return [<Link key="paper" href={href} onClick={() => setMode("pro")}>Review paper futures <span>↗</span></Link>]; const demo = `${href}${href.includes("?") ? "&" : "?"}intent=demo`; const live = `${href}${href.includes("?") ? "&" : "?"}intent=live`; return [<Link key="demo" href={demo} onClick={() => setMode("pro")}>Review Bitget demo spot <span>↗</span></Link>, <Link key="live" href={live} onClick={() => setMode("pro")}>Review Bitget live spot <span>↗</span></Link>]; })}</div></div>)}</div><small>Research can be uncertain. A review link never places a trade or switches your account into live mode.{mode === "mini" ? " Trade reviews open the Pro workspace controls." : ""}</small></div> : <div className="flow-no-handoff"><span className="flow-kicker">RISK GATE / HOLD</span><b>No trading handoff for this read.</b><p>Review the sources and decision gates above. You can return when fresher or stronger evidence is available.</p><Link href="/markets">Explore the market map ↗</Link></div>}
    </section> : null}
  </div>;
}
