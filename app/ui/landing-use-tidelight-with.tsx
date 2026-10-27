"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./landing-use-tidelight-with.module.css";

const examples = {
  React: {
    mark: "R", label: "React", language: "tsx", href: "https://package.tidelight.app/react", action: "React package guide",
    install: "npm install @tidelight/react @tidelight/sdk",
    code: `import { TidelightProvider, useTokenizedEquities, TokenizedEquityGrid } from "@tidelight/react";\n\nfunction MarketPanel() {\n  const result = useTokenizedEquities({ underlyingTicker: "NVDA", limit: 20 });\n\n  return <TokenizedEquityGrid\n    instruments={result.data?.data ?? []}\n    isLoading={result.isLoading}\n    error={result.error?.message}\n    onRetry={result.refresh}\n  />;\n}\n\n// Inject an authenticated same-origin server client.\n<TidelightProvider client={applicationServerClient}>\n  <MarketPanel />\n</TidelightProvider>`,
  },
  TypeScript: {
    mark: "TS", label: "TypeScript", language: "ts", href: "https://package.tidelight.app/sdk", action: "TypeScript SDK guide",
    install: "npm install @tidelight/sdk",
    code: `import { TidelightClient } from "@tidelight/sdk";\n\nconst client = new TidelightClient({\n  apiKey: process.env.TIDELIGHT_API_KEY!,\n});\n\nconst page = await client.listTokenizedEquities({\n  limit: 20,\n  underlyingTicker: "AAPL",\n});\n\nfor (const instrument of page.data) {\n  console.log(instrument.symbol, instrument.underlying_ticker);\n}`,
  },
  Python: {
    mark: "Py", label: "Python", language: "python", href: "https://package.tidelight.app/python", action: "Python SDK guide",
    install: "python -m pip install tidelight",
    code: `import os\nfrom tidelight import Client\n\nclient = Client(os.environ["TIDELIGHT_API_KEY"])\npage = client.list_tokenized_equities(\n    limit=20,\n    underlying_ticker="AAPL",\n)\n\nfor instrument in page.data:\n    print(instrument.symbol, instrument.underlying_ticker)`,
  },
  REST: {
    mark: "API", label: "REST API", language: "bash", href: "https://dev.tidelight.app/api", action: "REST API reference",
    install: "GET  https://api.tidelight.app/v1/market/instruments",
    code: `curl --fail-with-body \\\n  -H "Authorization: Bearer $TIDELIGHT_API_KEY" \\\n  -H "Accept: application/json" \\\n+  "https://api.tidelight.app/v1/market/instruments?kind=rtoken&underlying_ticker=AAPL&limit=10"`,
  },
  MCP: {
    mark: "MCP", label: "MCP", language: "bash", href: "https://package.tidelight.app/mcp", action: "MCP integration guide",
    install: "npm install --global @tidelight/mcp@0.1.2",
    code: `# Store a scoped project key in your local secret manager or process env.\nexport TIDELIGHT_API_KEY="YOUR_TIDELIGHT_PROJECT_KEY"\n\n# The bridge forwards MCP requests to Tidelight over Streamable HTTP.\ntidelight-mcp`,
  },
} as const;
type Framework = keyof typeof examples;
const frameworks = Object.keys(examples) as Framework[];

const syntax = (source: string) => source.split(/("[^"\n]*"|'[^'\n]*'|`[^`]*`|\b(?:import|from|const|export|default|function|return|await|for|in|new|async|as|true|false|null|if|print)\b|\b\d+\b|\/\/[^\n]*|#[^\n]*)/g).map((part, index) => {
  if (!part) return null;
  let tone = "";
  if (/^("|'|`)/.test(part)) tone = styles.string;
  else if (/^(\/\/|#)/.test(part)) tone = styles.comment;
  else if (/^(import|from|const|export|default|function|return|await|for|in|new|async|as|true|false|null|if|print)$/.test(part)) tone = styles.keyword;
  else if (/^\d+$/.test(part)) tone = styles.number;
  return tone ? <span className={tone} key={index}>{part}</span> : part;
});

export default function LandingUseTidelightWith() {
  const [framework, setFramework] = useState<Framework>("React");
  const [copied, setCopied] = useState(false);
  const selected = examples[framework];
  async function copyCode() {
    try {
      await navigator.clipboard.writeText(selected.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return <section className={styles.section} aria-labelledby="use-tidelight-title">
    <div className={styles.heading}><div><span className="landing-kicker"><i /> A SMALL, WELL-DEFINED INTEGRATION SURFACE</span><h2 id="use-tidelight-title">Use Tidelight with<br /><em>the tools you already build with.</em></h2><p>Bring source-linked market context into your product through a framework SDK, server API, or research-ready MCP tools.</p></div><Link href="/developers/integrations">Explore all integrations <span aria-hidden="true">↗</span></Link></div>
    <div className={styles.feature} aria-label="Illustration of a Tidelight research request moving through evidence and market checks">
      <div className={styles.featureTop}><span><i /> TIDELIGHT RESEARCH / LIVE SHAPE</span><span>ILLUSTRATIVE UI · NO LIVE DATA</span></div>
      <div className={styles.workspace}>
        <aside className={styles.workspaceRail}><span className={styles.railMark}>≈</span><span className={styles.railActive}>Research desk</span><span>Evidence</span><span>Market context</span><span>Decision review</span><span className={styles.railBottom}>PAPER-FIRST</span></aside>
        <div className={styles.workspaceMain}>
          <div className={styles.workspaceHeader}><div><span className={styles.micro}>RESEARCH SNAPSHOT / AAPL</span><strong>What changed around the latest company update?</strong></div><span className={styles.state}><i /> REVIEWABLE</span></div>
          <div className={styles.researchFlow} aria-hidden="true"><div className={`${styles.flowNode} ${styles.flowQuestion}`}><span>01 / QUESTION</span><b>Frame the event</b><small>One editable prompt</small></div><span className={styles.flowLine}><i /></span><div className={`${styles.flowNode} ${styles.flowEvidence}`}><span>02 / EVIDENCE</span><b>Inspect the sources</b><small>Links · dates · claims</small></div><span className={styles.flowLine}><i /></span><div className={`${styles.flowNode} ${styles.flowMarket}`}><span>03 / EXPOSURE</span><b>Check market context</b><small>Coverage · freshness · limits</small></div></div>
          <div className={styles.workspaceResults}><div><span className={styles.resultIcon}>↗</span><div><b>Evidence stays attached</b><small>Source and retrieval time travel with each result.</small></div></div><div><span className={styles.resultIcon}>⌁</span><div><b>Market data stays bounded</b><small>Unavailable context is surfaced, never filled in.</small></div></div><span className={styles.resultBadge}>USER REVIEW REQUIRED</span></div>
        </div>
        <div className={styles.activityBeam} aria-hidden="true"><i /><i /><i /></div>
      </div>
      <div className={styles.featureFoot}><span><b /> Source linked</span><span><b /> Market scoped</span><span><b /> You stay in control</span><small>Concept animation · no live research request is made</small></div>
    </div>
    <div className={styles.integration}>
      <div className={styles.integrationIntro}><span className={styles.overline}>ONE CLEAR WAY TO START</span><h3>Use Tidelight with<br /><em>{selected.label}</em></h3><p>Start with a supported instrument lookup. Keep credentials on your server and the returned market context tied to its source.</p><div className={styles.install}><span>GET STARTED</span><code>{selected.install}</code></div><Link href={selected.href}>Read the {selected.action.toLowerCase()} <span aria-hidden="true">↗</span></Link></div>
      <div className={styles.codePanel}><div className={styles.tabbar} role="tablist" aria-label="Choose an integration framework">{frameworks.map((name) => <button key={name} id={`tidelight-tab-${name.toLowerCase()}`} type="button" role="tab" aria-selected={framework === name} aria-controls="tidelight-code-panel" onClick={() => { setFramework(name); setCopied(false); }}><span>{examples[name].mark}</span><b>{name}</b></button>)}</div><div className={styles.codeMeta}><span><i /> {selected.language.toUpperCase()} / {selected.label}</span><button type="button" onClick={copyCode} aria-live="polite">{copied ? "Copied" : "Copy code"}</button></div><pre id="tidelight-code-panel" role="tabpanel" aria-labelledby={`tidelight-tab-${framework.toLowerCase()}`} tabIndex={0}><code>{syntax(selected.code)}</code></pre><div className={styles.codeFoot}><span>API key stays in trusted server code</span><span>Source: official SDK quickstart</span></div></div>
    </div>
    <p className={styles.dataNote}>Market examples refer to supported tokenized equity spot instruments. They are not direct shares or stock perpetuals; provider availability and terms are enforced by the API.</p>
  </section>;
}
