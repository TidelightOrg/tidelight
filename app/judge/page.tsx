import Link from "next/link";
import TidelightAnimatedMark from "@/app/ui/tidelight-animated-mark";
import "./judge.css";

const evidence = [
  { label: "EVENT", title: "After-hours earnings shock", body: "A public company update lands while the US primary market is closed. Tidelight starts with the question, not a prediction." },
  { label: "EVIDENCE", title: "Claims stay attached to sources", body: "Publisher, timestamp, excerpt, confidence, and counter-evidence remain visible beside the conclusion." },
  { label: "EXPOSURE", title: "The Bitget Reality market is mapped", body: "The affected rToken, quote freshness, session state, and execution context are shown before a scenario is considered." },
  { label: "DECISION", title: "Risk gates can say no", body: "The paper plan is only available when evidence, freshness, sizing, exposure, and pause controls agree." },
];

const proof = [
  ["Source lineage", "Captured source → claim → counterpoint → conclusion"],
  ["Market context", "Reality instrument, provider timestamp, session and cost context"],
  ["Decision trace", "Question → evidence → exposure → scenario → risk gate"],
  ["Safe execution", "Paper-only review with deterministic rejection reasons"],
];

export const metadata = {
  title: "Judge Mode · Tidelight",
  description: "A five-minute, no-login evaluation of Tidelight's evidence-first after-hours research desk.",
};

export default function JudgePage() {
  return <main className="judge-page">
    <section className="judge-hero">
      <div className="judge-hero-top">
        <span className="judge-brand"><TidelightAnimatedMark /> TIDELIGHT</span>
        <span className="judge-badge">PUBLIC EVALUATOR MODE · NO LOGIN</span>
      </div>
      <div className="judge-hero-grid">
        <div>
          <span className="judge-kicker">AI TRADING DESK / AFTER-HOURS INTELLIGENCE</span>
          <h1>From an overnight event to a decision you can inspect.</h1>
          <p className="judge-lede">Tidelight is an evidence-first control room for tokenized US equities. This fixed replay shows the complete trust path in under five minutes, without pretending that a staged result is live performance.</p>
          <div className="judge-actions">
            <Link className="judge-primary" href="/flow?demo=1&question=Should%20I%20review%20the%20affected%20rToken%20after%20an%20after-hours%20earnings%20event%3F">Run the live research path <span>↗</span></Link>
            <Link className="judge-secondary" href="/demo">Read the product walkthrough <span>→</span></Link>
            <Link className="judge-secondary" href="/evidence">Inspect evidence manifest <span>↗</span></Link>
            <Link className="judge-secondary" href="/replay/c5f5b22e-c995-4a5e-8193-5737c4d413b8">Read a live rTSLA review <span>↗</span></Link>
          </div>
        </div>
        <aside className="judge-hero-card" aria-label="Judge mode summary">
          <div className="judge-card-mark"><TidelightAnimatedMark /></div>
          <span className="judge-card-eyebrow">THE TRUST SPINE</span>
          <strong>Event → Evidence → Exposure → Scenario → Decision</strong>
          <small>One product trace. Human final say. Paper execution by default.</small>
        </aside>
      </div>
    </section>

    <section className="judge-section">
      <div className="judge-section-heading">
        <span className="judge-kicker">01 / THE FIVE-MINUTE REVIEW</span>
        <h2>Follow one decision without opening a private workspace.</h2>
      </div>
      <div className="judge-evidence-grid">
        {evidence.map((item, index) => <article className="judge-evidence-card" key={item.label}>
          <span className="judge-index">0{index + 1}</span>
          <span className="judge-kicker">{item.label}</span>
          <h3>{item.title}</h3>
          <p>{item.body}</p>
        </article>)}
      </div>
    </section>

    <section className="judge-split">
      <div>
        <span className="judge-kicker">02 / WHAT IS VERIFIED</span>
        <h2>Proof is part of the interface.</h2>
        <p>Every important statement has a place in the trace. A missing source, stale quote, contradictory claim, or failed gate is visible rather than silently replaced with confidence.</p>
        <Link className="judge-inline-link" href="/evidence">Open the public evidence manifest <span>↗</span></Link>
      </div>
      <div className="judge-proof-list">
        {proof.map(([label, text], index) => <div key={label}><span>0{index + 1}</span><div><b>{label}</b><small>{text}</small></div></div>)}
      </div>
    </section>

    <section className="judge-section judge-lanes">
      <div className="judge-section-heading">
        <span className="judge-kicker">03 / THE OTHER TWO MODES</span>
        <h2>One evidence standard across the product.</h2>
      </div>
      <div className="judge-lane-grid">
        <Link href="/strategies"><span>ALPHA FACTORY</span><strong>Challenge the rule.</strong><small>Completed candles, holdout windows, fees, slippage, drawdown and trade logs.</small><em>Open Strategy Lab ↗</em></Link>
        <Link href="/nightwatch"><span>AGENTIC TRADING</span><strong>Guard the paper action.</strong><small>Freshness, sizing, exposure, pause, duplicate and daily-loss checks remain explicit.</small><em>Open Nightwatch ↗</em></Link>
      </div>
    </section>

    <section className="judge-section">
      <div className="judge-section-heading"><span className="judge-kicker">05 / REPRODUCIBLE PROOF</span><h2>Inspect the artifacts, not just the pitch.</h2></div>
      <div className="judge-lane-grid">
        <Link href="/evidence"><span>PUBLIC EVIDENCE</span><strong>Open the evidence manifest.</strong><em>Routes, artifact status, limitations and reproduction requirements ↗</em></Link>
        <Link href="/replay/4e86bf9c-7295-4be1-ae52-487341e7f1ca"><span>LIVE RESEARCH TRACE</span><strong>Inspect the rMSFT evidence.</strong><em>Owner-published source and market snapshot ↗</em></Link>
        <Link href="/flow"><span>OWNER-PUBLISHED REPLAY</span><strong>Publish a real research run.</strong><em>After a completed run, share a 30-day source-linked replay with judges ↗</em><small>Publishing requires a signed-in owner and explicit consent.</small></Link>
        <Link href="/strategies"><span>ALPHA FACTORY</span><strong>Export a reproducible strategy run.</strong><em>Authenticated runs include candle fingerprints, costs and holdout data ↗</em></Link>
        <Link href="/nightwatch"><span>NIGHTWATCH</span><strong>Export private paper evidence.</strong><em>Account-scoped decisions and paper ledger; review privacy before sharing ↗</em></Link>
        <Link href="/nightwatch/replays"><span>NIGHTWATCH · PUBLIC REPLAYS</span><strong>Inspect owner-published trade replays.</strong><em>One simulated fill, its decision context, costs, and risk notes ↗</em></Link>
      </div>
    </section>

    <section className="judge-section judge-published-research" aria-labelledby="published-research-title">
      <div className="judge-section-heading"><span className="judge-kicker">06 / OWNER-PUBLISHED RESEARCH</span><h2 id="published-research-title">Seven live records. One clear evidence boundary.</h2><p>Five new token reviews join the two earlier public examples. Every card opens a real owner-published snapshot with captured sources, instrument checks, and risk gates. Links expire 30 days after publication and can be revoked.</p></div>
      <p className="judge-lede">Across the five new runs, 40 issuer headlines were collected per company from 17–30 publishers. AI synthesis was unavailable in each, so these are transparent fallback records rather than completed analyst theses. No directional assessment or trade handoff was made; each replay shows quote freshness and unmeasured token-market checks.</p>
      <div className="judge-lane-grid">
        <Link href="/replay/c5f5b22e-c995-4a5e-8193-5737c4d413b8"><span>RTSLA · EV / AUTOMOTIVE</span><strong>Would you review the rTSLA market?</strong><small>40 issuer headlines across 30 publishers. The token quote was stale; depth, spread, and premium/discount were not measured.</small><em>Inspect published replay ↗</em></Link>
        <Link href="/replay/4e86bf9c-7295-4be1-ae52-487341e7f1ca"><span>RMSFT · AI / CLOUD</span><strong>How do AI investment and Azure demand change the risk picture?</strong><small>40 issuer headlines across 23 publishers. The token quote was fresh at capture; market depth, spread, and premium/discount were not measured.</small><em>Inspect published replay ↗</em></Link>
        <Link href="/replay/5d27e66c-2a87-4450-95d3-5014e1309216"><span>RAAPL · DEVICES / SERVICES</span><strong>What should a long-term rAAPL review verify?</strong><small>40 issuer headlines across 22 publishers. The token quote was stale; the run did not assess rAAPL tradability.</small><em>Inspect published replay ↗</em></Link>
        <Link href="/replay/7ca56a20-c064-4f99-b351-806b2ddd685e"><span>RGOOGL · REGULATION / AI SEARCH</span><strong>How should antitrust remedies and AI-search competition be reviewed?</strong><small>40 issuer headlines across 17 publishers. The token quote was fresh at capture; liquidity, spread, and premium/discount were not measured.</small><em>Inspect published replay ↗</em></Link>
        <Link href="/replay/c67d7b29-85eb-4c27-8a29-2cbe85bd4e91"><span>RAMZN · CLOUD / RETAIL</span><strong>How do AWS investment and retail economics shape the review?</strong><small>40 issuer headlines across 21 publishers. The token quote was fresh at capture; no trading handoff was made.</small><em>Inspect published replay ↗</em></Link>
        <Link href="/replay/c2ffbe89-74a5-4547-bf89-5952e37efeaa"><span>RNVDA · TOKENIZED MARKET</span><strong>Is the rNVDA market worth reviewing?</strong><small>Earlier owner-published run. Inspect its original issuer coverage, instrument context, and stated limitations.</small><em>Inspect published replay ↗</em></Link>
        <Link href="/replay/91bb478a-7977-4b34-b32d-b1f558a8af75"><span>NVDA + TSLA · COMPARISON</span><strong>Compare the latest evidence and risks.</strong><small>Earlier owner-published comparison with separate issuer assessments and decision gates.</small><em>Inspect published replay ↗</em></Link>
      </div>
    </section>

    <section className="judge-final">
      <div><span className="judge-kicker">04 / THE HONEST BOUNDARY</span><h2>Useful evidence is not a promise of profit.</h2><p>This route is a reproducible product evaluation. It does not claim audited alpha, investment advice, live execution, or an invented paper fill. When the real gates do not qualify, Tidelight says so.</p></div>
      <div className="judge-final-actions"><Link className="judge-primary" href="/flow?demo=1&question=Compare%20the%20latest%20evidence%20for%20NVDA%20and%20TSLA%20and%20show%20the%20risks">Start evaluation <span>↗</span></Link><Link href="/">Return to Tidelight <span>→</span></Link></div>
    </section>
  </main>;
}
