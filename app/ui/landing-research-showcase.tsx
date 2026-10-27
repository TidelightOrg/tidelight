"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./landing-research-showcase.module.css";

const stages = [
  { id: "signal", label: "Signal desk", mark: "01", title: "What changed around the latest company update?", tag: "RESEARCH SNAPSHOT / AAPL", summary: "A company filing becomes a question worth investigating.", panel: "Frame the event", detail: "One editable prompt", kind: "question" },
  { id: "evidence", label: "Evidence", mark: "02", title: "Trace each claim to its source.", tag: "SOURCE REVIEW / AAPL", summary: "Read the original source, date, claim, and context together.", panel: "Inspect the sources", detail: "Links · dates · claims", kind: "evidence" },
  { id: "exposure", label: "Market context", mark: "03", title: "Separate issuer context from instrument limits.", tag: "INSTRUMENT CONTEXT / AAPL", summary: "See what market data is available, when it was observed, and what it can support.", panel: "Check market context", detail: "Provider · timestamp · session", kind: "market" },
  { id: "review", label: "Decision review", mark: "04", title: "Keep uncertainty visible before a decision.", tag: "REVIEW GATE / AAPL", summary: "Bring counterpoints and risk into view while the decision remains yours.", panel: "Review the open questions", detail: "Counter-evidence · risks · next step", kind: "review" },
] as const;

const integrations = [
  { id: "typescript", label: "TypeScript", title: "Use Tidelight with TypeScript", install: "npm install @tidelight/sdk@0.1.2", code: `import { TidelightClient } from "@tidelight/sdk";\n\nconst client = new TidelightClient({\n  apiKey: process.env.TIDELIGHT_API_KEY!,\n});\n\nconst page = await client.listTokenizedEquities({\n  limit: 20,\n  underlyingTicker: "AAPL",\n});\n\nfor (const instrument of page.data) {\n  console.log(instrument.symbol, instrument.underlying_ticker);\n}`, href: "https://tidelight.app/developers/packages/sdk" },
  { id: "python", label: "Python", title: "Use Tidelight with Python", install: "python -m pip install tidelight", code: `import os\nfrom tidelight import Client\n\nclient = Client(os.environ["TIDELIGHT_API_KEY"])\n\npage = client.list_tokenized_equities(\n    limit=20,\n    underlying_ticker="AAPL",\n)\n\nfor instrument in page.data:\n    print(instrument.symbol, instrument.underlying_ticker)`, href: "https://tidelight.app/developers/packages/python" },
  { id: "rest", label: "REST API", title: "Use Tidelight with REST", install: "GET /v1/market/instruments", code: `curl --request GET \\\n  --url 'https://api.tidelight.app/v1/market/instruments?kind=rtoken&underlying_ticker=AAPL&limit=10' \\\n  --header "Authorization: Bearer $TIDELIGHT_API_KEY" \\\n  --header 'Accept: application/json'`, href: "https://dev.tidelight.app/#reference" },
  { id: "mcp", label: "MCP", title: "Use Tidelight with MCP", install: "npm install --global @tidelight/mcp@0.1.2", code: `export TIDELIGHT_API_KEY='YOUR_SCOPED_PROJECT_KEY'\n\ntidelight-mcp`, href: "https://tidelight.app/developers/packages/mcp" },
] as const;

const codeKeywords = new Set([
  "import", "from", "const", "let", "var", "await", "for", "of", "in", "return", "export", "default", "function", "async", "new", "class", "if", "else", "try", "catch", "throw", "as", "true", "false", "null", "None", "def", "with", "print", "curl",
]);

function highlightCode(source: string): React.ReactNode[] {
  const tokens = /(#.*$|\/\/.*$|--[\w-]+|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$]*\b|=>|===?|!==?|<=?|>=?|[{}()[\].,:;!+*/=%-])/gm;
  const rendered: React.ReactNode[] = [];
  let cursor = 0;
  let index = 0;
  for (const match of source.matchAll(tokens)) {
    const value = match[0];
    const start = match.index ?? 0;
    if (start > cursor) rendered.push(source.slice(cursor, start));
    let tokenClass = "";
    if (value.startsWith("#") || value.startsWith("//")) tokenClass = styles.codeComment;
    else if (value.startsWith("\"") || value.startsWith("'") || value.startsWith("`")) tokenClass = styles.codeString;
    else if (/^\d/.test(value)) tokenClass = styles.codeNumber;
    else if (value.startsWith("--")) tokenClass = styles.codeFlag;
    else if (codeKeywords.has(value)) tokenClass = styles.codeKeyword;
    else if (/^[A-Z][A-Z0-9_]*$/.test(value)) tokenClass = styles.codeConstant;
    else if (/^[A-Za-z_$][\w$]*$/.test(value) && /^\s*\(/.test(source.slice(start + value.length))) tokenClass = styles.codeFunction;
    else if (/^(?:=>|===?|!==?|<=?|>=?|[{}()[\].,:;!+*/=%-])$/.test(value)) tokenClass = styles.codePunctuation;
    rendered.push(tokenClass ? <span className={tokenClass} key={`token-${index++}`}>{value}</span> : value);
    cursor = start + value.length;
  }
  if (cursor < source.length) rendered.push(source.slice(cursor));
  return rendered;
}

function IntegrationMark({ id }: { id: (typeof integrations)[number]["id"] }) {
  if (id === "typescript") return <svg className={styles.markTypescript} viewBox="0 0 36 36" aria-hidden="true"><rect x="2" y="2" width="32" height="32" rx="8"/><path d="M8 14h13v3.1h-4.8V28h-3.5V17.1H8V14Zm14.1 9.8c1 .8 2.1 1.3 3.5 1.3 1.2 0 1.9-.5 1.9-1.2 0-.8-.6-1.1-2.3-1.8l-.9-.4c-2.6-1.1-4.3-2.4-4.3-5.1 0-2.5 1.9-4.4 5-4.4 2.2 0 3.8.7 5 2.5l-2.7 1.8c-.6-1-1.2-1.4-2.3-1.4-.9 0-1.5.5-1.5 1.2 0 .8.5 1.1 1.8 1.7l.9.4c3.1 1.3 4.8 2.6 4.8 5.4 0 3.1-2.5 4.8-5.7 4.8-3.2 0-5.2-1.4-6.2-3.3l3-1.5Z"/></svg>;
  if (id === "python") return <svg className={styles.markPython} viewBox="0 0 36 36" aria-hidden="true"><path className={styles.pythonBlue} d="M17.7 4c-6.8 0-6.4 2.9-6.4 2.9v4.3h6.5v1.3H8.7S4 12 4 18.2s4.1 5.9 4.1 5.9h2.5v-3.5s-.1-4.2 4.2-4.2h7.1s4 .1 4-3.9V7.6S26.5 4 17.7 4Zm-3.5 3.1a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6Z"/><path className={styles.pythonYellow} d="M18.3 32c6.8 0 6.4-2.9 6.4-2.9v-4.3h-6.5v-1.3h9.1s4.7.5 4.7-5.7-4.1-5.9-4.1-5.9h-2.5v3.5s.1 4.2-4.2 4.2h-7.1s-4-.1-4 3.9v4.9S9.5 32 18.3 32Zm3.5-3.1a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6Z"/></svg>;
  if (id === "rest") return <svg className={styles.markRest} viewBox="0 0 36 36" aria-hidden="true"><rect x="2" y="2" width="32" height="32" rx="8"/><path d="M11 11h14M11 18h9M11 25h14"/><circle cx="24" cy="18" r="3"/><path d="M24 15v-4m0 14v-4"/></svg>;
  return <svg className={styles.markMcp} viewBox="0 0 36 36" aria-hidden="true"><path d="m18 7 10 6v10l-10 6-10-6V13l10-6Z"/><path d="m8 13 10 6 10-6M18 19v10"/><circle cx="18" cy="7" r="2.3"/><circle cx="8" cy="13" r="2.3"/><circle cx="28" cy="13" r="2.3"/><circle cx="8" cy="23" r="2.3"/><circle cx="28" cy="23" r="2.3"/><circle cx="18" cy="29" r="2.3"/></svg>;
}

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
      <div className={styles.demoFoot}><span><i/> Source-linked context</span><span>One reviewable step at a time</span><Link href="/research">Open the research desk <b aria-hidden="true">↗</b></Link></div>
    </div>
    <div className={styles.integration}>
      <div className={styles.integrationIntro}><span className="landing-kicker">BUILT TO FIT YOUR STACK</span><h2>Use Tidelight<br/><em>with your tools.</em></h2><p>Bring source-linked market context into your product through the framework, language, or agent workflow you already use.</p><span className={styles.keyNote}><i/> Keep project keys in trusted server code.</span></div>
      <div className={styles.codePanel}>
        <div className={styles.frameworkTabs} role="tablist" aria-label="Choose a Tidelight integration" onKeyDown={(event) => handleTabKey(event, integrations, integrationId, (id) => setIntegrationId(id as typeof integrationId), "integration-tab")}>
          {integrations.map((item) => <button key={item.id} type="button" role="tab" id={`integration-tab-${item.id}`} aria-selected={integrationId === item.id} aria-controls="integration-code-panel" tabIndex={integrationId === item.id ? 0 : -1} onClick={() => { setIntegrationId(item.id); setCopied(false); }}><span className={styles.frameworkGlyph}><IntegrationMark id={item.id} /></span><span className={styles.frameworkLabel}>{item.label}</span></button>)}
        </div>
        <div className={styles.codeHeading} id="integration-code-panel" role="tabpanel" aria-labelledby={`integration-tab-${integration.id}`}><div><span className={styles.codeDot}/><h3>{integration.title}</h3></div><button type="button" onClick={copyExample} aria-label="Copy integration example">{copied ? "Copied" : "Copy"}</button></div>
        <div className={styles.install}><span>GET STARTED</span><code>{integration.install}</code></div>
        <pre className={styles.code} aria-label={`${integration.label} code example`}><code>{highlightCode(integration.code)}</code></pre>
        <div className={styles.codeFoot}><span>SERVER-SIDE EXAMPLE</span><a href={integration.href} target="_blank" rel="noreferrer">Read the {integration.label} guide <b aria-hidden="true">↗</b></a></div>
      </div>
    </div>
  </section>;
}
