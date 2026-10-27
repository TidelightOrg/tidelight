"use client";

import { useState } from "react";
import styles from "./landing-research-showcase.module.css";

const stages = [
  { id: "signal", label: "Signal desk", mark: "01", title: "What changed around the latest company update?", tag: "RESEARCH SNAPSHOT / AAPL", summary: "A company filing becomes a question worth investigating.", panel: "Frame the event", detail: "One editable prompt", kind: "question" },
  { id: "evidence", label: "Evidence", mark: "02", title: "Trace each claim to its source.", tag: "SOURCE REVIEW / AAPL", summary: "Read the original source, date, claim, and context together.", panel: "Inspect the sources", detail: "Links · dates · claims", kind: "evidence" },
  { id: "exposure", label: "Market context", mark: "03", title: "Separate issuer context from instrument limits.", tag: "INSTRUMENT CONTEXT / AAPL", summary: "See what market data is available, when it was observed, and what it can support.", panel: "Check market context", detail: "Provider · timestamp · session", kind: "market" },
  { id: "review", label: "Decision review", mark: "04", title: "Keep uncertainty visible before a decision.", tag: "REVIEW GATE / AAPL", summary: "Bring counterpoints and risk into view while the decision remains yours.", panel: "Review the open questions", detail: "Counter-evidence · risks · next step", kind: "review" },
] as const;

const integrations = [
  { id: "typescript", label: "TypeScript", glyph: "TS", title: "Use Tidelight with TypeScript", install: "npm install @tidelight/sdk@0.1.2", code: `import { TidelightClient } from "@tidelight/sdk";\n\nconst client = new TidelightClient({\n  apiKey: process.env.TIDELIGHT_API_KEY!,\n});\n\nconst page = await client.listTokenizedEquities({\n  limit: 20,\n  underlyingTicker: "AAPL",\n});\n\nfor (const instrument of page.data) {\n  console.log(instrument.symbol, instrument.underlying_ticker);\n}`, href: "https://dev.tidelight.app/typescript" },
  { id: "python", label: "Python", glyph: "Py", title: "Use Tidelight with Python", install: "python -m pip install tidelight", code: `import os\nfrom tidelight import Client\n\nclient = Client(os.environ["TIDELIGHT_API_KEY"])\n\npage = client.list_tokenized_equities(\n    limit=20,\n    underlying_ticker="AAPL",\n)\n\nfor instrument in page.data:\n    print(instrument.symbol, instrument.underlying_ticker)`, href: "https://dev.tidelight.app/python" },
  { id: "rest", label: "REST API", glyph: "API", title: "Use Tidelight with REST", install: "GET /v1/market/instruments", code: `curl --request GET \\\n  --url 'https://api.tidelight.app/v1/market/instruments?kind=rtoken&underlying_ticker=AAPL&limit=10' \\\n  --header "Authorization: Bearer $TIDELIGHT_API_KEY" \\\n  --header 'Accept: application/json'`, href: "https://dev.tidelight.app/api" },
  { id: "mcp", label: "MCP", glyph: "◈", title: "Use Tidelight with MCP", install: "npm install --global @tidelight/mcp@0.1.2", code: `export TIDELIGHT_API_KEY='YOUR_SCOPED_PROJECT_KEY'\n\ntidelight-mcp`, href: "https://dev.tidelight.app/mcp" },
] as const;

function StageGlyph({ kind }: { kind: (typeof stages)[number]["kind"] }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {kind === "question" ? <><path d="M5 5.5h14M5 10h9M5 14.5h6"/><circle cx="17.5" cy="16.5" r="3"/><path d="m19.7 18.7 2 2"/></> : null}
    {kind === "evidence" ? <><path d="M7 3.8h7l4 4v12.4H7z"/><path d="M14 3.8v4h4M9.5 12h6M9.5 15.5h6"/><circle cx="5" cy="6" r="1"/><circle cx="5" cy="12" r="1"/><circle cx="5" cy="18" r="1"/></> : null}
    {kind === "market" ? <><path d="M4 18.5V6.7L12 3l8 3.7v11.8L12 22l-8-3.5Z"/><path d="m4.5 7 7.5 3.5L19.5 7M12 10.8V21"/></> : null}
    {kind === "review" ? <><path d="M12 3 19 6v5.1c0 4.7-2.9 7.8-7 9.9-4.1-2.1-7-5.2-7-9.9V6l7-3Z"/><path d="m9 12 2 2 4-4"/></> : null}
  </svg>;
}

export default function LandingResearchShowcase() {
  const [stageId, setStageId] = useState<(typeof stages)[number]["id"]>("signal");
  const [integrationId, setIntegrationId] = useState<(typeof integrations)[number]["id"]>("typescript");
  const [copied, setCopied] = useState(false);
  const stage = stages.find((item) => item.id === stageId) ?? stages[0];
  const integration = integrations.find((item) => item.id === integrationId) ?? integrations[0];

  function handleTabKey(event: React.KeyboardEvent<HTMLDivElement>, tabs: readonly { id: string }[], selectedId: string, select: (id: string) => void, prefix: string) {
    const currentIndex = tabs.findIndex((tab) => tab.id === selectedId);
    const nextIndex = event.key === "ArrowRight" ? (currentIndex + 1) % tabs.length
      : event.key === "ArrowLeft" ? (currentIndex - 1 + tabs.length) % tabs.length
      : event.key === "Home" ? 0
      : event.key === "End" ? tabs.length - 1
      : -1;
    if (nextIndex < 0) return;
    event.preventDefault();
    const next = tabs[nextIndex];
    select(next.id);
    document.getElementById(`${prefix}-${next.id}`)?.focus();
  }

  async function copyExample() {
    try {
      await navigator.clipboard.writeText(integration.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return <section className={styles.showcase} aria-label="Explore the Tidelight research experience">
    <div className={styles.showcaseHead}><span className="landing-kicker"><i /> A SIGNAL, FOLLOWED THROUGH</span><h2>Follow the thread.<br/><em>Keep the evidence in view.</em></h2><p>Move from a market question to its sources, context, and decision risks in one connected research path.</p></div>
    <div className={styles.demo}>
      <div className={styles.demoBar}><span className={styles.live}><i/> TIDELIGHT RESEARCH / LIVE SHAPE</span><span className={styles.disclaimer}>ILLUSTRATIVE UI <b>·</b> NO LIVE DATA</span></div>
      <div className={styles.demoTabs} role="tablist" aria-label="Research path stages" onKeyDown={(event) => handleTabKey(event, stages, stageId, (id) => setStageId(id as typeof stageId), "research-tab")}>
        <span className={styles.demoMark} aria-hidden="true">≈</span>
        {stages.map((item) => <button type="button" key={item.id} role="tab" id={`research-tab-${item.id}`} aria-selected={stageId === item.id} aria-controls="research-stage-panel" tabIndex={stageId === item.id ? 0 : -1} onClick={() => setStageId(item.id)}><span>{item.label}</span></button>)}
      </div>
      <div className={styles.demoBody} id="research-stage-panel" role="tabpanel" aria-labelledby={`research-tab-${stage.id}`}>
        <div className={styles.story}><span className={styles.eyebrow}>{stage.tag}</span><h3>{stage.title}</h3><p>{stage.summary}</p><span className={styles.status}><i/> REVIEWABLE</span></div>
        <div className={styles.path}>
          <span className={styles.pathRail} aria-hidden="true"/>
          <article className={`${styles.pathCard} ${styles.primaryCard}`}><span className={styles.cardIndex}>{stage.mark} / {stage.kind.toUpperCase()}</span><div className={styles.pathCardMain}><span className={styles.stageGlyph}><StageGlyph kind={stage.kind}/></span><div><h4>{stage.panel}</h4><p>{stage.detail}</p></div><span className={styles.cardArrow}>↗</span></div></article>
          <article className={`${styles.pathCard} ${styles.secondaryCard}`}><span className={styles.cardIndex}>NEXT IN THE THREAD</span><div className={styles.pathCardMain}><span className={styles.stageGlyph}><StageGlyph kind={stages[(stages.findIndex((item) => item.id === stage.id) + 1) % stages.length].kind}/></span><div><h4>{stages[(stages.findIndex((item) => item.id === stage.id) + 1) % stages.length].label}</h4><p>Continue with the supporting context</p></div><span className={styles.cardArrow}>→</span></div></article>
        </div>
      </div>
      <div className={styles.demoFoot}><span><i/> Source-linked context</span><span>One reviewable step at a time</span><a href="/research">Open the research desk <b aria-hidden="true">↗</b></a></div>
    </div>
    <div className={styles.integration}>
      <div className={styles.integrationIntro}><span className="landing-kicker">BUILT TO FIT YOUR STACK</span><h2>Use Tidelight<br/><em>with your tools.</em></h2><p>Bring source-linked market context into your product through the framework, language, or agent workflow you already use.</p><span className={styles.keyNote}><i/> Keep project keys in trusted server code.</span></div>
      <div className={styles.codePanel}>
        <div className={styles.frameworkTabs} role="tablist" aria-label="Choose a Tidelight integration" onKeyDown={(event) => handleTabKey(event, integrations, integrationId, (id) => setIntegrationId(id as typeof integrationId), "integration-tab")}>
          {integrations.map((item) => <button key={item.id} type="button" role="tab" id={`integration-tab-${item.id}`} aria-selected={integrationId === item.id} aria-controls="integration-code-panel" tabIndex={integrationId === item.id ? 0 : -1} onClick={() => { setIntegrationId(item.id); setCopied(false); }}><span className={styles.frameworkGlyph}>{item.glyph}</span><span className={styles.frameworkLabel}>{item.label}</span></button>)}
        </div>
        <div className={styles.codeHeading} id="integration-code-panel" role="tabpanel" aria-labelledby={`integration-tab-${integration.id}`}><div><span className={styles.codeDot}/><h3>{integration.title}</h3></div><button type="button" onClick={copyExample} aria-label="Copy integration example">{copied ? "Copied" : "Copy"}</button></div>
        <div className={styles.install}><span>GET STARTED</span><code>{integration.install}</code></div>
        <pre className={styles.code}><code>{integration.code}</code></pre>
        <div className={styles.codeFoot}><span>SERVER-SIDE EXAMPLE</span><a href={integration.href} target="_blank" rel="noreferrer">Read the {integration.label} guide <b aria-hidden="true">↗</b></a></div>
      </div>
    </div>
  </section>;
}
