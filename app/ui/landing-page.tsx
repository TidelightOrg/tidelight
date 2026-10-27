import Link from "next/link";
import Image from "next/image";
import LandingDocsEmbed from "@/app/ui/landing-docs-embed";
import { NavigationTrail } from "@/app/ui/navigation-icon";
import LandingResearchShowcase from "@/app/ui/landing-research-showcase";
import { TidelightSignatureFooter } from "@/app/ui/tidelight-signature-footer";
import { LandingNavigation } from "@/app/ui/landing-navigation";
import { UseCasesPortalLink } from "@/app/ui/use-cases-portal-link";
import { LandingMarketOrbit } from "@/app/ui/landing-market-orbit";

const capabilities = [
  ["Research", "Turn a plain-language question into a source-led market brief."],
  ["Exposure", "Map the story to issuers, sectors, and tokenized instruments."],
  ["Action", "Move from a considered view to paper or live-ready decisions."],
];

const workflows = [
  { number: "01", label: "RESEARCH", title: "Understand a company event", body: "Compare source-backed claims, counter-evidence, and the details that could change the view.", href: "/research", action: "Open Research Desk" },
  { number: "02", label: "MARKETS", title: "Trace the market exposure", body: "Connect an event to supported tokenized instruments and inspect quote freshness before drawing conclusions.", href: "/markets", action: "Explore Market Map" },
  { number: "03", label: "STRATEGY", title: "Test a rule on historical data", body: "Review the fixed holdout, costs, trades, and assumptions in a reproducible strategy replay.", href: "/strategies", action: "Open Strategy Lab" },
  { number: "04", label: "PAPER REVIEW", title: "Observe a guarded decision", body: "Follow an owner-controlled paper check with explicit limits. No live orders are sent.", href: "/nightwatch", action: "See Nightwatch" },
  { number: "05", label: "BUILD", title: "Connect through API or MCP", body: "Use scoped developer access to request supported market data and asynchronous company research.", href: "/developers", action: "Explore developer tools" },
];

const signalStages = [
  { number: "01", title: "Frame the event", body: "Turn the question on your mind into a useful research starting point.", tag: "QUESTION", icon: "event", href: "/research", action: "Ask a question" },
  { number: "02", title: "Follow the evidence", body: "Review source links, timestamps, supporting claims, and counterpoints together.", tag: "SOURCE TRAIL", icon: "evidence", href: "/evidence", action: "Inspect evidence" },
  { number: "03", title: "Map the exposure", body: "Keep issuer research distinct from tokenized instrument and quote context.", tag: "MARKET CONTEXT", icon: "exposure", href: "/markets", action: "Explore markets" },
  { number: "04", title: "Review the gate", body: "See what supports or blocks a paper handoff. Every action stays yours.", tag: "DECISION CHECK", icon: "gate", href: "/judge", action: "Review Judge Mode" },
];

function SignalStageIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    event: <><path d="M4 18.5V6.8L12 3l8 3.8v11.7L12 22l-8-3.5Z"/><path d="m4.5 7 7.5 3.5L19.5 7M12 10.8V21"/><circle cx="17.2" cy="13.8" r="1.5"/></>,
    evidence: <><path d="M7 3.8h7l4 4v12.4H7z"/><path d="M14 3.8v4h4M9.5 12h6M9.5 15.5h6"/><circle cx="6" cy="17.5" r="2.5"/><path d="m8 19.5 2 2"/></>,
    exposure: <><path d="M3.5 19.5h17M5.5 17V9h4v8M10 17V5h4v12M14.5 17v-5h4v5"/><path d="m4 7 5-3 4 2 6-3"/><circle cx="19" cy="3" r="1"/></>,
    gate: <><path d="M12 3 19 6v5.2c0 4.4-2.8 7.6-7 9.8-4.2-2.2-7-5.4-7-9.8V6l7-3Z"/><path d="m9 12 2 2 4-4"/></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export default function LandingPage() {
  return <main className="landing-page">
    <LandingNavigation />
    <LandingMarketOrbit />
    <section className="landing-hero">
      <div className="landing-hero-copy"><span className="landing-kicker"><i /> THE INTELLIGENCE LAYER FOR MARKETS THAT NEVER SLEEP</span><h1>The market moves.<br /><em>Tidelight makes sense of it.</em></h1><p>Ask what you actually want to know. Tidelight connects live market context, evidence, exposure, and scenarios into one calm decision surface—for curious beginners and serious operators alike.</p><div className="landing-actions"><Link className="landing-primary" href="/research">Ask Tidelight a question <NavigationTrail className="landing-arrow" /></Link><Link className="landing-secondary" href="/use-cases">Explore use cases <NavigationTrail className="landing-arrow" /></Link></div><div className="landing-trust"><span><i /> Live public market context</span><span><i /> Agent-assisted research</span><span><i /> Paper-first controls</span></div></div>
      <div className="landing-hero-stage" aria-label="Tidelight live signal interface">
        <div className="landing-stage-glow" />
        <p className="landing-dyor"><span>THE TIDELIGHT STANDARD</span><strong>DYOR</strong><small>Do your own research.</small></p>
        <span className="landing-pointer" aria-hidden="true"><svg viewBox="0 0 64 80" focusable="false"><path d="M27 8c-4 0-7 3-7 7v30l-4-4a6 6 0 0 0-8.5 8.5l13 14a15 15 0 0 0 11 5h4c10 0 18-8 18-18V27a6 6 0 0 0-12 0v-6a6 6 0 0 0-12 0v-6a6 6 0 0 0-2.5-4.9Z" /></svg></span>
        <span className="landing-product-word" aria-hidden="true">TIDELIGHT</span>
        <div className="landing-orbit"><div className="landing-orbit-ring ring-one" /><div className="landing-orbit-ring ring-two" /><div className="landing-orbit-core"><span>tide</span><b>light</b><small>LIVE SIGNAL</small><i className="landing-core-pulse" /></div><span className="orbit-label orbit-label-one">EVENT / LIVE</span><span className="orbit-label orbit-label-two">EVIDENCE</span><span className="orbit-label orbit-label-three">DECISION</span></div>
        <div className="landing-hand-art">
          <Image className="landing-tide-hand" src="/tide-hand.webp" alt="A hand holding Tide, the Tidelight intelligence companion" width={430} height={645} priority />
          <span className="landing-egg-mark" aria-hidden="true"><svg viewBox="0 0 64 64" focusable="false"><circle className="egg-mark-star" cx="48.5" cy="17.5" r="3.5" /><path className="egg-mark-wave egg-mark-wave-a" d="M11 34.5c7.3 0 7.3-10 14.6-10s7.3 10 14.7 10c7.3 0 7.3-10 14.7-10" /><path className="egg-mark-wave egg-mark-wave-b" d="M11 44.5c7.3 0 7.3-6 14.6-6s7.3 6 14.7 6c7.3 0 7.3-6 14.7-6" /></svg></span>
        </div>
        <div className="landing-stage-readout"><span><i /> SIGNAL DESK</span><b>Following the ripple</b><small>Event → Evidence → Exposure → Scenario</small></div>
      </div>
    </section>
    <UseCasesPortalLink />
    <LandingResearchShowcase />
    <section className="landing-signal-path" aria-labelledby="landing-signal-path-title">
      <div className="landing-signal-heading"><div><span className="landing-kicker"><i /> A RESEARCH PATH YOU CAN TRACE</span><h2 id="landing-signal-path-title">From market question<br /><em>to a clearer decision.</em></h2><p>Each step adds context you can inspect. The signal stays connected to its sources, market limits, and decision gate.</p></div><Link href="/judge">See how Judge Mode works <NavigationTrail className="landing-arrow" /></Link></div>
      <div className="landing-signal-visual" aria-label="Illustration of the Tidelight research path, from event through evidence and exposure to a review gate">
        <div className="landing-signal-track" aria-hidden="true"><span /><span /><span /></div>
        {signalStages.map((stage, index) => <article className={`landing-signal-stage landing-signal-stage-${stage.icon}`} key={stage.number}>
          <div className="landing-signal-stage-top"><span>{stage.number}</span><small>{stage.tag}</small></div>
          <div className="landing-signal-glyph"><SignalStageIcon name={stage.icon} /><i /></div>
          <h3>{stage.title}</h3><p>{stage.body}</p>
          <Link href={stage.href}>{stage.action}<NavigationTrail className="landing-arrow" /></Link>
          {index < signalStages.length - 1 ? <span className="landing-signal-connector" aria-hidden="true">→</span> : null}
        </article>)}
      </div>
      <div className="landing-signal-note"><span><i /> SOURCE-LINKED</span><span><i /> MARKET CONTEXT</span><span><i /> PAPER-FIRST CONTROLS</span><small>Illustrative workflow · no live activity shown</small></div>
    </section>
    <section className="landing-proof" id="method"><div className="landing-section-heading"><span className="landing-kicker">ONE CONNECTED ECOSYSTEM</span><h2>Everything you need<br /><em>before you make a move.</em></h2><p className="landing-section-lede">Research, markets, paper trading, and decision history—connected in one clear market research workflow.</p></div><div className="landing-capabilities">{capabilities.map(([title, body], index) => <article key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{body}</p></article>)}</div></section>
    <section className="landing-workflows" id="workflows" aria-labelledby="landing-workflows-title"><div className="landing-section-heading"><span className="landing-kicker">START WITH THE JOB YOU HAVE</span><h2 id="landing-workflows-title">One platform.<br/><em>Five clear ways in.</em></h2><p className="landing-section-lede">Choose a workflow to see what Tidelight can do, how it works, and where to inspect the evidence.</p></div><div className="landing-workflow-grid">{workflows.map(item => <article key={item.number}><div className="landing-workflow-meta"><span>{item.number}</span><small>{item.label}</small></div><h3>{item.title}</h3><p>{item.body}</p><Link href={item.href}>{item.action}<NavigationTrail className="landing-arrow"/></Link></article>)}</div><Link className="landing-guide-link" href="/guide">Read the complete getting-started guide <NavigationTrail className="landing-arrow"/></Link></section>
    <LandingDocsEmbed />
    <section className="landing-method"><div><span className="landing-kicker">THE TIDELIGHT METHOD</span><h2>One question in.<br /><em>One clearer next step out.</em></h2><p>Tide helps you ask naturally. Market research brings together current evidence and exposure. A clear activity trace shows each check. You stay in control of the decision.</p></div><Link href="/flow">Explore market research <NavigationTrail className="landing-arrow" /></Link></section>
    <section className="landing-bottom"><div><span className="landing-kicker">BUILT FOR MARKETS THAT NEVER SLEEP</span><h2>Start with the question<br /><em>you actually have.</em></h2></div><Link className="landing-primary" href="/overview">Enter your workspace <NavigationTrail className="landing-arrow" /></Link></section>
    <section className="landing-ecosystem" aria-labelledby="landing-ecosystem-title">
      <div className="landing-ecosystem-heading"><span className="landing-kicker">TIDELIGHT ECOSYSTEM</span><h2 id="landing-ecosystem-title">Explore the ecosystem</h2></div>
      <div className="landing-ecosystem-grid">
        <a className="landing-ecosystem-link" href="https://dev.tidelight.app/"><span className="landing-ecosystem-index">01</span><strong>Developer docs</strong><small>Guides and API reference</small><NavigationTrail className="landing-arrow" /></a>
        <a className="landing-ecosystem-link" href="https://package.tidelight.app/"><span className="landing-ecosystem-index">02</span><strong>Packages</strong><small>SDK, MCP, Python, React, and CLI</small><NavigationTrail className="landing-arrow" /></a>
        <Link className="landing-ecosystem-link" href="/developers/console"><span className="landing-ecosystem-index">03</span><strong>Console</strong><small>API explorer</small><NavigationTrail className="landing-arrow" /></Link>
        <Link className="landing-ecosystem-link" href="/developers/integrations"><span className="landing-ecosystem-index">04</span><strong>Integration guides</strong><small>Choose between API, MCP, and packages</small><NavigationTrail className="landing-arrow" /></Link>
        <Link className="landing-ecosystem-link" href="/developers/support"><span className="landing-ecosystem-index">05</span><strong>Human support</strong><small>Talk directly with the Tidelight team</small><NavigationTrail className="landing-arrow" /></Link>
      </div>
    </section>
    <TidelightSignatureFooter surface="research" />
  </main>;
}