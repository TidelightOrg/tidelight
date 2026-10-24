import Link from "next/link";
import Image from "next/image";
import TidelightAnimatedMark from "@/app/ui/tidelight-animated-mark";
import "./judge.css";

const researchReplays = [
  { id: "c5f5b22e-c995-4a5e-8193-5737c4d413b8", symbol: "rTSLA", focus: "Automotive", question: "Would you review the rTSLA market?", detail: "40 headlines · 30 publishers · quote stale" },
  { id: "4e86bf9c-7295-4be1-ae52-487341e7f1ca", symbol: "rMSFT", focus: "AI and cloud", question: "How do AI investment and Azure demand change the risk picture?", detail: "40 headlines · 23 publishers · quote fresh at capture" },
  { id: "5d27e66c-2a87-4450-95d3-5014e1309216", symbol: "rAAPL", focus: "Devices and services", question: "What should a long-term rAAPL review verify?", detail: "40 headlines · 22 publishers · quote stale" },
  { id: "7ca56a20-c064-4f99-b351-806b2ddd685e", symbol: "rGOOGL", focus: "Regulation and AI search", question: "How should antitrust remedies and AI-search competition be reviewed?", detail: "40 headlines · 17 publishers · quote fresh at capture" },
  { id: "c67d7b29-85eb-4c27-8a29-2cbe85bd4e91", symbol: "rAMZN", focus: "Cloud and retail", question: "How do AWS investment and retail economics shape the review?", detail: "40 headlines · 21 publishers · no trade handoff" },
  { id: "c2ffbe89-74a5-4547-bf89-5952e37efeaa", symbol: "rNVDA", focus: "Tokenized market", question: "Is the rNVDA market worth reviewing?", detail: "Issuer coverage · instrument context · stated limits" },
  { id: "91bb478a-7977-4b34-b32d-b1f558a8af75", symbol: "NVDA + TSLA", focus: "Company comparison", question: "Compare the latest evidence and risks.", detail: "Separate issuer assessments · decision gates" },
];

const captures = [
  { symbol: "rNVD", name: "NVIDIA token", date: "22 Oct 2026", dateTime: "2026-10-22", image: "/judge-evidence/nightwatch-rnvd-position.png", alt: "Historical Nightwatch simulated ledger position in rNVD, captured 22 October 2026." },
  { symbol: "rAAPL", name: "Apple token", date: "14 Oct 2026", dateTime: "2026-10-14", image: "/judge-evidence/nightwatch-raapl-position.png", alt: "Historical Nightwatch simulated ledger position in rAAPL, captured 14 October 2026." },
  { symbol: "rGOOGL", name: "Alphabet token", date: "12 Oct 2026", dateTime: "2026-10-12", image: "/judge-evidence/nightwatch-rgoogl-position.png", alt: "Historical Nightwatch simulated ledger position in rGOOGL, captured 12 October 2026." },
];

export const metadata = {
  title: "Judge Mode · Tidelight",
  description: "Evaluate Tidelight's evidence-first market research, strategy testing, and paper risk controls.",
};

export default function JudgePage() {
  return <main className="judge-page">
    <section className="judge-hero">
      <header className="judge-hero-top">
        <Link className="judge-brand" href="/" aria-label="Tidelight home"><TidelightAnimatedMark /> TIDELIGHT</Link>
        <span className="judge-badge">JUDGE MODE</span>
      </header>
      <div className="judge-hero-grid">
        <div>
          <span className="judge-kicker">AI TRADING DESK · PUBLIC EVALUATION</span>
          <h1>Follow the evidence.<br /><em>Inspect the decision.</em></h1>
          <p className="judge-lede">Trace an after-hours market question through its sources, tokenized instrument context, scenarios, and risk gates.</p>
          <div className="judge-actions">
            <Link className="judge-primary" href="/flow?demo=1&question=Should%20I%20review%20the%20affected%20rToken%20after%20an%20after-hours%20earnings%20event%3F">Start the evaluation <span aria-hidden="true">↗</span></Link>
            <Link className="judge-secondary" href="/evidence">Evidence and methods <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
        <aside className="judge-hero-card" aria-label="Evaluation path">
          <svg className="judge-signal-art" viewBox="0 0 440 240" role="img" aria-label="Research evidence signals converging into a market finding">
            <defs><linearGradient id="judge-ribbon" x1="0" x2="1"><stop stopColor="var(--mint)" stopOpacity=".08"/><stop offset=".55" stopColor="var(--mint)" stopOpacity=".62"/><stop offset="1" stopColor="#7bd8c2" stopOpacity=".16"/></linearGradient><radialGradient id="judge-glow"><stop stopColor="var(--mint)" stopOpacity=".26"/><stop offset="1" stopColor="var(--mint)" stopOpacity="0"/></radialGradient></defs>
            <ellipse cx="300" cy="108" rx="126" ry="103" fill="url(#judge-glow)"/><path className="judge-art-grid" d="M20 38H420M20 88H420M20 138H420M20 188H420M70 20V218M150 20V218M230 20V218M310 20V218M390 20V218"/>
            <path className="judge-art-band" d="M22 176C77 170 88 122 130 130S193 180 236 126 306 57 348 92 389 104 418 54V151C384 194 371 162 344 157S286 143 244 180 176 211 132 178 78 202 22 211Z"/><path className="judge-art-line" d="M22 193C77 187 88 143 130 151S193 196 236 153 306 83 348 118 389 129 418 82"/>
            <g className="judge-art-nodes"><circle cx="130" cy="151" r="5"/><circle cx="236" cy="153" r="5"/><circle cx="348" cy="118" r="5"/><circle cx="418" cy="82" r="6"/></g>
            <g className="judge-art-labels"><rect x="34" y="47" width="84" height="24" rx="12"/><text x="76" y="63" textAnchor="middle">SOURCES</text><rect x="162" y="26" width="84" height="24" rx="12"/><text x="204" y="42" textAnchor="middle">CONTEXT</text><rect x="282" y="198" width="82" height="24" rx="12"/><text x="323" y="214" textAnchor="middle">RISK GATE</text></g>
          </svg>
          <div className="judge-card-mark"><TidelightAnimatedMark /></div>
          <div className="judge-path"><span>Event</span><i>→</i><span>Evidence</span><i>→</i><span>Exposure</span><i>→</i><span>Risk gate</span></div>
          <p>Research is reviewable. Actions remain paper-only and user-controlled.</p>
        </aside>
      </div>
      <div className="judge-trace" aria-label="Evaluation stages">
        <article><span>01</span><div><b>Frame the event</b><small>Start with a question, not a prediction.</small></div></article>
        <article><span>02</span><div><b>Check the evidence</b><small>Inspect sources, timestamps, claims, and counterpoints.</small></div></article>
        <article><span>03</span><div><b>Map the market</b><small>Review instrument, quote freshness, and session context.</small></div></article>
        <article><span>04</span><div><b>Review the gate</b><small>See why a paper action is allowed or blocked.</small></div></article>
      </div>
    </section>

    <section className="judge-section" aria-labelledby="research-title">
      <div className="judge-section-heading">
        <div><span className="judge-kicker">PUBLIC RESEARCH</span><h2 id="research-title">Published research replays</h2></div>
        <p>Five snapshots used source-only fallback when AI synthesis was unavailable. None produced a directional assessment or trade handoff.</p>
      </div>
      <div className="judge-replay-grid">
        {researchReplays.map((replay) => <Link className="judge-replay-card" href={`/replay/${replay.id}`} key={replay.id}>
          <div className="judge-replay-top"><span>{replay.symbol}</span><small>{replay.focus}</small></div>
          <h3>{replay.question}</h3>
          <p>{replay.detail.split(" · ").map((part, index) => <span key={`${replay.id}-${part}`}>{index ? " · " : null}{part}</span>)}</p>
          <b>Open replay <span aria-hidden="true">↗</span></b>
        </Link>)}
      </div>
      <p className="judge-section-note">Quotes describe capture-time freshness. These records do not measure token depth, spread, or premium/discount. Published links can be revoked or expire.</p>
      <div className="judge-inline-actions">
        <Link href="/flow">Publish an eligible research run <span aria-hidden="true">↗</span></Link>
        <Link href="/evidence">Open the evidence manifest <span aria-hidden="true">↗</span></Link>
      </div>
    </section>

    <section className="judge-section judge-strategy" aria-labelledby="strategy-title">
      <div className="judge-strategy-copy">
        <span className="judge-kicker">STRATEGY LAB</span>
        <h2 id="strategy-title">Test the rule on unseen data.</h2>
        <p>Review holdout periods, costs, candle fingerprints, drawdown, and trade logs. The report links to the assumptions needed to reproduce a run.</p>
        <Link className="judge-primary" href="/strategies">Open Strategy Lab <span aria-hidden="true">↗</span></Link>
      </div>
      <aside className="judge-strategy-proof">
        <span>PUBLIC REPLAY · APPLE · 4H</span>
        <strong>−0.76% after costs</strong>
        <p>Holdout return trailed buy and hold (+2.12%) over 32 days. Historical simulation; costs estimated, no live orders.</p>
        <div className="judge-strategy-links">
          <a href="https://tidelight.app/strategy-replay/58348395-ff65-4a4c-be5a-019234379587">Open replay <span aria-hidden="true">↗</span></a>
          <a href="https://tidelight.app/api/strategy-replays/58348395-ff65-4a4c-be5a-019234379587">Download JSON <span aria-hidden="true">↓</span></a>
        </div>
      </aside>
    </section>

    <section className="judge-section judge-nightwatch" aria-labelledby="nightwatch-title">
      <div className="judge-capture-heading">
        <div className="judge-capture-title">
          <span className="judge-kicker">NIGHTWATCH · HISTORICAL PAPER CAPTURES</span>
          <h2 id="nightwatch-title">Recorded positions</h2>
          <p>Simulated marks captured 12–22 October 2026. This exhibit is not a live account query or audited performance.</p>
        </div>
        <Link className="judge-capture-data-link" href="/evidence/nightwatch-position-captures.json">Capture data <span aria-hidden="true">↗</span></Link>
      </div>
      <div className="judge-capture-grid">
        {captures.map((capture) => <figure key={capture.symbol}>
          <a href={capture.image} target="_blank" rel="noreferrer"><Image src={capture.image} width={1200} height={630} alt={capture.alt} /></a>
          <figcaption><div className="judge-capture-caption"><strong>{capture.symbol}</strong><span>{capture.name}</span></div><time dateTime={capture.dateTime}>{capture.date}</time></figcaption>
        </figure>)}
      </div>
      <article className="judge-email-proof" id="nightwatch-email-delivery">
        <div className="judge-email-copy">
          <span className="judge-kicker">NIGHTWATCH · EMAIL DELIVERY</span>
          <h3>Notification received for RNVDUSDT.</h3>
          <p>Gmail received the Nightwatch analysis on 24 October 2026 at 09:00 WAT. SPF, DKIM, and DMARC passed. The message records a rejected HOLD because an existing long position was active.</p>
          <p className="judge-email-limit">This verifies email delivery and rendering. It does not independently verify ledger state, an exchange order, or trading performance.</p>
          <div className="judge-inline-actions">
            <a href="/evidence/nightwatch-email-delivery.json">Delivery record <span aria-hidden="true">↗</span></a>
            <a href="/judge-evidence/nightwatch-rnvdusdt-email.jpeg" target="_blank" rel="noreferrer">Open Gmail capture <span aria-hidden="true">↗</span></a>
          </div>
        </div>
        <a className="judge-email-shot" href="/judge-evidence/nightwatch-rnvdusdt-email.jpeg" target="_blank" rel="noreferrer" aria-label="Open the full Gmail screenshot for the RNVDUSDT Nightwatch email">
          <Image src="/judge-evidence/nightwatch-rnvdusdt-email.jpeg" width={598} height={1536} alt="Gmail screenshot of a Tidelight Nightwatch analysis email for RNVDUSDT, received at 9:00 AM. The message says HOLD was rejected because an existing long position was active." />
        </a>
      </article>
      <section className="judge-notification-proof" aria-labelledby="notification-evidence-title">
        <div className="judge-notification-heading"><div><span className="judge-kicker">NIGHTWATCH · EMAIL EVIDENCE</span><h3 id="notification-evidence-title">Signal and simulated fill notifications</h3></div><a href="/evidence/nightwatch-email-notifications.json">Evidence record ↗</a></div>
        <div className="judge-notification-proof-grid">
          <article className="judge-notification-card">
            <a className="judge-notification-image" href="/judge-evidence/nightwatch-raaplusdt-buy-alert.jpg" target="_blank" rel="noreferrer" aria-label="Open RAAPLUSDT Nightwatch buy alert screenshot"><Image src="/judge-evidence/nightwatch-raaplusdt-buy-alert.jpg" width={705} height={1639} alt="Gmail screenshot of a Tidelight Nightwatch BUY signal alert for RAAPLUSDT, received at 1:40 AM." /></a>
            <div><span className="judge-kicker">PAPER SIGNAL</span><h4>RAAPLUSDT buy alert</h4><p>Gmail capture of the Nightwatch BUY signal email and its rendered alert details.</p><a href="/judge-evidence/nightwatch-raaplusdt-buy-alert.jpg" target="_blank" rel="noreferrer">Open screenshot ↗</a></div>
          </article>
          <article className="judge-notification-card">
            <a className="judge-notification-image" href="/judge-evidence/nightwatch-raaplusdt-paper-fill.jpg" target="_blank" rel="noreferrer" aria-label="Open RAAPLUSDT Nightwatch paper fill screenshot"><Image src="/judge-evidence/nightwatch-raaplusdt-paper-fill.jpg" width={720} height={1648} alt="Gmail screenshot of a Tidelight Nightwatch paper buy filled notification for RAAPLUSDT, received at 1:40 AM." /></a>
            <div><span className="judge-kicker">PAPER FILL</span><h4>RAAPLUSDT paper buy filled</h4><p>Gmail capture of the Nightwatch simulated fill email and its rendered details.</p><a href="/judge-evidence/nightwatch-raaplusdt-paper-fill.jpg" target="_blank" rel="noreferrer">Open screenshot ↗</a></div>
          </article>
        </div>
        <p className="judge-section-note">These captures show Gmail delivery and message content. The messages are not exchange receipts or audited performance records.</p>
      </section>
      <div className="judge-inline-actions">
        <Link href="/nightwatch/replays">Browse published paper replays <span aria-hidden="true">↗</span></Link>
        <Link href="/nightwatch">Open Nightwatch <span aria-hidden="true">↗</span></Link>
      </div>
    </section>

    <footer className="judge-footer">
      <p>Historical simulations are not audited results. Research is not investment advice; live execution is not enabled.</p>
      <Link href="/evidence">Evidence manifest <span aria-hidden="true">↗</span></Link>
    </footer>
  </main>;
}
