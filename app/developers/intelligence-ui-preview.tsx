"use client";

import { useState } from "react";

type View = "overview" | "sources" | "response";

const views: { id: View; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "sources", label: "Source trail" },
  { id: "response", label: "API response" },
];

export function IntelligenceUiPreview() {
  const [view, setView] = useState<View>("overview");

  return (
    <div className="tic-intelligence-ui" aria-label="Interactive Intelligence Cloud interface preview">
      <div className="tic-intelligence-ui-top">
        <div className="tic-intelligence-ui-brand"><span aria-hidden="true">t.</span><div><b>Research desk</b><small>WORKSPACE / EXAMPLE</small></div></div>
        <span className="tic-intelligence-ui-badge"><i/> ILLUSTRATIVE FIXTURE</span>
      </div>
      <div className="tic-intelligence-ui-tabs" role="group" aria-label="Preview the intelligence interface">
        {views.map((item) => <button key={item.id} type="button" aria-pressed={view === item.id} onClick={() => setView(item.id)}>{item.label}</button>)}
      </div>
      <div className="tic-intelligence-ui-content" aria-live="polite">
        {view === "overview" ? <>
          <div className="tic-intelligence-ui-summary"><div><span>RESEARCH SNAPSHOT</span><h3>Context, with its trail attached.</h3><p>A sample interface for bringing source-aware research into your product.</p></div><span className="tic-intelligence-ui-state">READY TO REVIEW</span></div>
          <div className="tic-intelligence-ui-flow" aria-label="Research workflow: question, evidence, context, review">
            <div><small>01 / INPUT</small><b>A clear question</b><span>Bounded request</span></div><i aria-hidden="true">→</i>
            <div className="is-active"><small>02 / EVIDENCE</small><b>Sources attached</b><span>Provenance stays visible</span></div><i aria-hidden="true">→</i>
            <div><small>03 / REVIEW</small><b>Context in view</b><span>Human judgment stays central</span></div>
          </div>
          <div className="tic-intelligence-ui-foot"><span><i/> Source trail available</span><span>EXAMPLE CONTENT · NOT LIVE DATA</span></div>
        </> : view === "sources" ? <>
          <div className="tic-intelligence-ui-summary"><div><span>EVIDENCE TRAIL</span><h3>Keep every claim close to its source.</h3><p>Show where a result came from before it travels downstream.</p></div><span className="tic-intelligence-ui-state">PROVENANCE FIRST</span></div>
          <ol className="tic-intelligence-ui-sources"><li><i>01</i><span><b>Primary record</b><small>Origin and publication time</small></span><em>ATTACHED</em></li><li><i>02</i><span><b>Market observation</b><small>Provider and observed time</small></span><em>ATTACHED</em></li><li><i>03</i><span><b>Research context</b><small>Interpretation kept distinct from source data</small></span><em>REVIEW</em></li></ol>
          <div className="tic-intelligence-ui-foot"><span><i/> Source labels remain visible</span><span>EXAMPLE CONTENT · NOT LIVE DATA</span></div>
        </> : <>
          <div className="tic-intelligence-ui-summary"><div><span>DEVELOPER RESPONSE</span><h3>One contract. Interfaces that feel native.</h3><p>Bring the same scoped service into a custom interface or the official React package.</p></div><span className="tic-intelligence-ui-state">API V1</span></div>
          <pre className="tic-intelligence-ui-code" tabIndex={0} aria-label="Example research job API response"><code>{`{
  "job_id": "job_…",
  "ticker": "AAPL",
  "status": "complete",
  "attempts": 1,
  "max_attempts": 3,
  "result": { "type": "company_snapshot", "generated_at": "…",
    "market": { "tokenized_equity_spot": [], "stock_perpetual": null },
    "evidence": { "mode": "headline_discovery", "items": [
      { "title": "…", "publisher": "…", "url": "…" }] },
    "limitations": ["…"] },
  "error": null,
  "created_at": "…",
  "started_at": "…",
  "completed_at": "…",
  "request_id": "req_…"
}`}</code></pre>
          <div className="tic-intelligence-ui-foot"><span><i/> Scoped access · Inspectable output</span><span>ILLUSTRATIVE SCHEMA</span></div>
        </>}
      </div>
    </div>
  );
}
