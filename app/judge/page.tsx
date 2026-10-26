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
  { id: "13bcee6c-3d69-4bd0-bb2c-e3591c73529b", symbol: "NVDA", focus: "AI infrastructure and competition", question: "What changed for NVDA based on current public sources?", detail: "40 headlines · 27 publishers · Gemini synthesis · mixed · 40% model-reported confidence · HOLD" },
  { id: "ed08a907-14b0-41dd-b731-78870fe3255b", symbol: "NVDA", focus: "Current public catalysts", question: "What are the latest public catalysts and key uncertainties for NVDA?", detail: "Fresh live research · 20 sources · 8 steps · handoff held" },
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

    <section className="judge-section judge-test-video" id="live-route-test-recording" aria-labelledby="test-video-title">
      <div className="judge-section-heading">
        <div><span className="judge-kicker">PUBLIC ROUTE CAPTURE · 24 OCT 2026</span><h2 id="test-video-title">Seven public routes responded.</h2></div>
        <p>In a signed-out browser check captured on 24 October 2026 at 1280 × 720, all seven public routes below returned HTTP 200.</p>
      </div>
      <div className="judge-route-capture-status" role="status">
        <span className="judge-route-capture-icon" aria-hidden="true">✓</span>
        <div><strong>Seven public routes returned HTTP 200 at capture time.</strong><small>Captured 24 October 2026 · Signed-out browser check · 1280 × 720 · machine-readable results linked below</small></div>
        <span className="judge-route-capture-badge">7 / 7 PASS</span>
      </div>
      <div className="judge-test-route-list" aria-label="Routes checked">
        {["/", "/markets", "/research", "/flow", "/strategies", "/nightwatch", "/judge"].map(path => <span key={path}><i aria-hidden="true">200</i><code>{path}</code></span>)}
      </div>
      <p className="judge-section-note">The route-check results are listed below and in the JSON report. The video here is a product walkthrough, not the route-test recording. Signed-in research, publishing, strategy execution, account data, and trading behavior are not represented.</p>
      <figure className="judge-test-video-frame judge-product-walkthrough">
        <video controls playsInline preload="metadata" poster="/landing-preview.png" aria-label="Tidelight public product walkthrough for the Bitget AI Base Camp Hackathon">
          <source src="https://media.githubusercontent.com/media/TidelightOrg/tidelight/main/production/tidelight-hackathon-cinematic-demo/deliverables/Tidelight_Hackathon_Cinematic_Demo_1080p.mp4" type="video/mp4" />
          Your browser does not support the video element.
        </video>
        <figcaption><span>Public product walkthrough · 3:54 · 1920 × 1080</span><a href="https://media.githubusercontent.com/media/TidelightOrg/tidelight/main/production/tidelight-hackathon-cinematic-demo/deliverables/Tidelight_Hackathon_Cinematic_Demo_1080p.mp4" target="_blank" rel="noreferrer">Open full video ↗</a></figcaption>
      </figure>
      <div className="judge-inline-actions">
        <Link href="/evidence/tidelight-live-route-test-20261024.json">Open capture record <span aria-hidden="true">↗</span></Link>
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

    <section className="judge-section judge-mcp" id="codex-mcp-evidence" aria-labelledby="codex-mcp-title">
      <div className="judge-section-heading">
        <div><span className="judge-kicker">CONNECTED CLIENTS · VERIFIED PATHS</span><h2 id="codex-mcp-title">MCP tools and research runs</h2></div>
        <p>These records cover separate client setups. The connected ChatGPT/Codex connector completed tokenized-market reads. The published npm stdio bridge exposed all five tools, including research start, status, and cancel. An authenticated Streamable HTTP session completed an MSFT research job. The traces below show which client performed each action.</p>
      </div>
      <div className="judge-mcp-steps" aria-label="Codex MCP setup status">
        <article><span>01</span><div><b>Plugin</b><small>Tidelight MCP Live Research · Streamable HTTP</small></div><i>Installed · connected</i></article>
        <article><span>02</span><div><b>Codex connector registry</b><small><code>tidelight_get_tokenized_equity</code> · <code>tidelight_search_tokenized_equities</code></small></div><i>Lookup · search</i></article>
        <article><span>03</span><div><b>Separate research clients</b><small>npm stdio bridge · direct Streamable HTTP · installed npm and Python SDKs</small></div><i>Traced below</i></article>
      </div>
      <div className="judge-inline-actions">
        <Link href="/replay/ed08a907-14b0-41dd-b731-78870fe3255b">Open fresh NVDA replay <span aria-hidden="true">↗</span></Link>
        <a href="https://dev.tidelight.app/#mcp">MCP connection guide <span aria-hidden="true">↗</span></a>
        <a href="https://mcp.tidelight.app/.well-known/oauth-protected-resource/mcp">OAuth resource metadata <span aria-hidden="true">↗</span></a>
        <Link href="/evidence/tidelight-codex-mcp.json">Current registry check <span aria-hidden="true">↗</span></Link>
        <Link href="/evidence/tidelight-codex-mcp-market-check-20261024.json">Live Codex market calls <span aria-hidden="true">↗</span></Link>
        <a href="/evidence/authenticated-research-20261025/README.md">Compare client traces and completed jobs <span aria-hidden="true">↗</span></a>
        <a href="/evidence/tidelight-research-job-client-attempt-20261024.json">Earlier Codex Cloud attempt · no jobs submitted <span aria-hidden="true">↗</span></a>
      </div>
    </section>

    <section className="judge-section judge-test-video" id="fresh-sdk-mcp-research-run" aria-labelledby="fresh-run-title">
      <div className="judge-section-heading">
        <div><span className="judge-kicker">FRESH · 25 OCTOBER 2026 · TERMINAL SESSION</span><h2 id="fresh-run-title">Published package checks passed.</h2></div>
        <p>Redacted GNU script capture from a brand-new consumer directory. It is not a browser screen recording and contains no report bodies or credentials.</p>
      </div>
      <div className="judge-route-capture-status" role="status">
        <span className="judge-route-capture-icon" aria-hidden="true">✓</span>
        <div><strong>Fresh npm + PyPI install/import and CLI checks passed.</strong><small>No authenticated research call was made in this capture; linked JSON lifecycle records are from an earlier run.</small></div>
        <span className="judge-route-capture-badge">INSTALL-ONLY</span>
      </div>
      <div className="judge-inline-actions">
        <a href="/evidence/judge-sdk-mcp-research-video-20261025/terminal-session.cast">Source cast <span aria-hidden="true">↓</span></a>
        <a href="/evidence/judge-sdk-mcp-research-video-20261025/README.md">Read verified results <span aria-hidden="true">↗</span></a>
        <a href="/evidence/judge-sdk-mcp-research-video-20261025/package-check.json">Versions and integrities <span aria-hidden="true">↗</span></a>
        <a href="/evidence/judge-sdk-mcp-research-video-20261025/SHA256SUMS.txt">SHA-256 manifest <span aria-hidden="true">↗</span></a>
      </div>
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
      <section className="judge-notification-proof" id="nightwatch-notification-evidence" aria-labelledby="notification-evidence-title">
        <div className="judge-notification-heading"><div><span className="judge-kicker">NIGHTWATCH · EMAIL EVIDENCE</span><h3 id="notification-evidence-title">Analysis, risk, and paper alerts</h3></div><div className="judge-inline-actions"><a href="/evidence/nightwatch-rmuusdt-email-captures.json">RMUUSDT evidence ↗</a><a href="/evidence/nightwatch-email-notifications.json">RAAPLUSDT alert data ↗</a></div></div>
        <div className="judge-notification-proof-grid">
          <article className="judge-notification-card">
            <a className="judge-notification-image" href="/judge-evidence/nightwatch-rmuusdt-analysis-email.jpg" target="_blank" rel="noreferrer" aria-label="Open RMUUSDT Nightwatch analysis complete email screenshot"><Image src="/judge-evidence/nightwatch-rmuusdt-analysis-email.jpg" width={673} height={1536} alt="User-provided Gmail screenshot of a Nightwatch analysis complete email for RMUUSDT. It reports HOLD and no action because SMA20 is below SMA50 and says no valid setup is available." /></a>
            <div><span className="judge-kicker">ANALYSIS · HOLD</span><h4>RMUUSDT analysis complete</h4><p>The email records a HOLD with no action: SMA20 remains below SMA50, the seven-day return is negative, and the playbook found no valid entry.</p><a href="/judge-evidence/nightwatch-rmuusdt-analysis-email.jpg" target="_blank" rel="noreferrer">Open screenshot ↗</a></div>
          </article>
          <article className="judge-notification-card">
            <a className="judge-notification-image" href="/judge-evidence/nightwatch-rmuusdt-risk-review-email.jpg" target="_blank" rel="noreferrer" aria-label="Open RMUUSDT Nightwatch risk review email screenshot"><Image src="/judge-evidence/nightwatch-rmuusdt-risk-review-email.jpg" width={609} height={1536} alt="User-provided Gmail screenshot of a Nightwatch risk review email for RMUUSDT, listing bearish moving-average alignment, no linked research, elevated volatility, token tracking divergence, and an invalidation condition." /></a>
            <div><span className="judge-kicker">RISK CONTEXT</span><h4>RMUUSDT risk review</h4><p>The email lists bearish SMA alignment, no linked research, 1.53% four-hour realized volatility, token tracking divergence, and the condition that would invalidate the bearish view.</p><a href="/judge-evidence/nightwatch-rmuusdt-risk-review-email.jpg" target="_blank" rel="noreferrer">Open screenshot ↗</a></div>
          </article>
          <article className="judge-notification-card">
            <a className="judge-notification-image" href="/judge-evidence/nightwatch-raaplusdt-buy-alert.jpg" target="_blank" rel="noreferrer" aria-label="Open RAAPLUSDT Nightwatch buy alert screenshot"><Image src="/judge-evidence/nightwatch-raaplusdt-buy-alert.jpg" width={705} height={1639} alt="Gmail screenshot of a Tidelight Nightwatch BUY signal alert for RAAPLUSDT, received at 1:40 AM." /></a>
            <div><span className="judge-kicker">PAPER SIGNAL</span><h4>RAAPLUSDT buy alert</h4><p>Gmail capture of the Nightwatch BUY signal email and its rendered alert details.</p><a href="/judge-evidence/nightwatch-raaplusdt-buy-alert.jpg" target="_blank" rel="noreferrer">Open screenshot ↗</a></div>
          </article>
          <article className="judge-notification-card">
            <a className="judge-notification-image" href="/judge-evidence/nightwatch-raaplusdt-paper-fill.jpg" target="_blank" rel="noreferrer" aria-label="Open RAAPLUSDT Nightwatch paper fill screenshot"><Image src="/judge-evidence/nightwatch-raaplusdt-paper-fill.jpg" width={720} height={1648} alt="Gmail screenshot of a Tidelight Nightwatch paper buy filled notification for RAAPLUSDT, received at 1:40 AM." /></a>
            <div><span className="judge-kicker">PAPER FILL</span><h4>RAAPLUSDT paper buy filled</h4><p>Gmail capture of the Nightwatch simulated fill email and its rendered details.</p><a href="/judge-evidence/nightwatch-raaplusdt-paper-fill.jpg" target="_blank" rel="noreferrer">Open screenshot ↗</a></div>
          </article>
        </div>
        <p className="judge-section-note">The RMUUSDT screenshots show user-provided Gmail message content. They document analysis and risk context, not a fill, trade, or account result. The RAAPLUSDT captures show email notifications; they are not exchange receipts or audited performance records.</p>
      </section>
      <div className="judge-inline-actions">
        <Link href="/nightwatch/replays">Browse published paper replays <span aria-hidden="true">↗</span></Link>
        <Link href="/nightwatch">Open Nightwatch <span aria-hidden="true">↗</span></Link>
      </div>
    </section>

    <section className="judge-section judge-evidence-score" id="research-benchmark" aria-labelledby="benchmark-title">
      <div className="judge-section-heading">
        <div><span className="judge-kicker">RESEARCH · FROZEN TEN EVENT SET</span><h2 id="benchmark-title">Ten runs captured. Internal score 2.5/10.</h2></div>
        <p>All ten frozen questions have production captures. The internal single-reviewer product score is 2.5/10. The formal claim-quality score still requires two independent reviews and adjudication; task time remains unmeasured.</p>
      </div>
      <div className="judge-score-grid">
        <article><span>RUN CAPTURE</span><strong>10 / 10</strong><small>All frozen events have production observations.</small></article>
        <article><span>AI SYNTHESIS</span><strong>2 / 10</strong><small>Two runs returned model synthesis; eight were source-only or had no synthesis.</small></article>
        <article><span>INTERNAL REVIEW</span><strong>2.5 / 10</strong><small>Single-reviewer descriptive score; protocol claim-quality score remains pending.</small></article>
      </div>
      <p className="judge-section-note">On this ten-run sample, only two outputs included model synthesis; both raised material evidence concerns. Eight were source-only or had no usable synthesis. The 2.5/10 figure is a provisional single-reviewer product assessment, not a factual-accuracy rate. Formal claim-quality scoring is pending independent labels and adjudication; task time was not measured. The September CPI run included off-topic sources.</p>
      <details className="judge-benchmark-run-table" open>
        <summary>Run-by-run production captures</summary>
        <div className="judge-benchmark-table-scroll"><table>
          <caption>Observed UI durations and outputs. These are not protocol task-time or claim-quality scores.</caption>
          <thead><tr><th scope="col">Frozen event</th><th scope="col">UI elapsed</th><th scope="col">Observed output</th></tr></thead>
          <tbody>
            <tr><th scope="row">NVIDIA FY2026 Q4</th><td>29 s</td><td>Gemini synthesis; reported 75% data-center revenue growth. No source-linked counter-evidence or trade handoff; quote freshness available.</td></tr>
            <tr><th scope="row">Apple FY2026 Q1</th><td>42 s</td><td>Source-only fallback with three headlines; no AI analysis. Exact frozen question was rerun after an earlier paraphrased run surfaced Q2 coverage.</td></tr>
            <tr><th scope="row">Microsoft FY2026 Q2</th><td>30 s</td><td>Gemini synthesis included a $678B backlog claim, up 84%, and institutional fund sales; no counter-evidence; quote stale.</td></tr>
            <tr><th scope="row">Amazon FY2025 Q4</th><td>3 s</td><td>No attributable sources returned; no synthesis.</td></tr>
            <tr><th scope="row">Tesla FY2025 Q4</th><td>32 s</td><td>Source-only fallback with 15 headlines across 11 publishers; synthesis unavailable.</td></tr>
            <tr><th scope="row">Alphabet FY2025 Q4</th><td>12 s</td><td>Qwen response based on one headline; no usable results; 10% model-reported confidence; no handoff.</td></tr>
            <tr><th scope="row">Federal Reserve January 2026 decision</th><td>34 s</td><td>18 macro sources collected; synthesis unavailable; no factual summary.</td></tr>
            <tr><th scope="row">U.S. August 2026 CPI</th><td>40 s</td><td>10 macro sources collected; synthesis unavailable; source-only output.</td></tr>
            <tr><th scope="row">U.S. September 2026 labor market</th><td>42 s</td><td>7 macro sources; source-only; 0% confidence; no verified conclusion or handoff; four steps.</td></tr>
            <tr><th scope="row">U.S. September 2026 CPI</th><td>41 s</td><td>15 macro sources; source-only; 0% confidence; no verified conclusion or handoff. Results included off-topic regional, PPI, Canada, and India items.</td></tr>
          </tbody>
        </table></div>
      </details>
      <div className="judge-inline-actions">
        <a href="/evidence/research-benchmark-review-20261024.json">Single-review assessment ↗</a>
        <a href="/evidence/research-benchmark-summary-20261024.json">Capture summary ↗</a>
        <a href="https://github.com/TidelightOrg/tidelight/blob/main/docs/benchmarks/research-benchmark-frozen-2026-10-24.json">Frozen event set ↗</a>
        <a href="https://github.com/TidelightOrg/tidelight/blob/main/docs/benchmarks/research-benchmark-capture-log-2026-10-24.md">Run-by-run capture log ↗</a>
        <a href="https://github.com/TidelightOrg/tidelight/tree/main/docs/benchmarks">GitHub benchmark files ↗</a>
      </div>
    </section>
    <section className="judge-section judge-evidence-score" id="package-install-evidence" aria-labelledby="package-test-title">
      <div className="judge-section-heading">
        <div><span className="judge-kicker">DEVELOPER ECOSYSTEM · FRESH BROWSER RECORDING</span><h2 id="package-test-title">npm and Python installs, live.</h2></div>
        <p>A fresh consumer walkthrough records each registry command, package import, CLI check, and outcome in Chromium.</p>
      </div>
      <div className="judge-package-proof-grid">
        <figure className="judge-package-proof-video">
          <video controls playsInline preload="metadata" aria-label="Live Chromium recording of Tidelight npm and Python package installs">
            <source src="/judge-evidence/npm-python-install-walkthrough-fresh-20261024.mp4" type="video/mp4" />
            Your browser does not support the video element.
          </video>
          <figcaption><span>Chromium 156 · 3:58 · H.264 · 960 × 540</span><a href="/judge-evidence/npm-python-install-walkthrough-fresh-20261024.mp4" target="_blank" rel="noreferrer">Open video ↗</a></figcaption>
        </figure>
        <aside className="judge-package-proof-results" aria-label="Recorded package results">
          <div className="judge-package-proof-summary">
            <span>FRESH CONSUMER RUN · 24 OCT 2026</span>
            <strong>12 / 12 commands passed</strong>
            <small>Four npm packages and the Python client installed from their public registries.</small>
          </div>
          <ul className="judge-package-proof-list">
            <li><div><strong>@tidelight/sdk@0.1.2</strong><small>npm install · ESM exports imported</small></div><b className="judge-package-pass">PASS</b></li>
            <li><div><strong>@tidelight/mcp@0.1.2</strong><small>npm install · MCP module imported</small></div><b className="judge-package-pass">PASS</b></li>
            <li><div><strong>@tidelight/react@0.1.2</strong><small>npm install · React exports imported</small></div><b className="judge-package-pass">PASS</b></li>
            <li><div><strong>@tidelight/cli@0.1.2</strong><small>npm install · CLI help · package dry-run</small></div><b className="judge-package-pass">PASS</b></li>
            <li><div><strong>tidelight==0.1.2</strong><small>Python 3.12 · pip install · Client import</small></div><b className="judge-package-pass">PASS</b></li>
          </ul>
          <p className="judge-package-proof-note">The Python release requires Python 3.10 or newer. A separate Python 3.9 probe was rejected by that declared minimum; the recorded Python 3.12.14 install and import passed.</p>
          <p className="judge-package-proof-note">The fresh npm consumer audit reported zero vulnerabilities. This recording verifies package installs and entry points; it does not make an authenticated API or MCP research request.</p>
        </aside>
      </div>
      <div className="judge-inline-actions">
        <a href="/evidence/npm-python-install-walkthrough-fresh-20261024.json">12-step install record ↗</a>
        <a href="https://raw.githubusercontent.com/TidelightOrg/tidelight/main/public/judge-evidence/npm-python-install-walkthrough-fresh-20261024.mp4">GitHub MP4 ↗</a>
        <a href="https://github.com/TidelightOrg/tidelight/blob/main/public/evidence/npm-python-install-walkthrough-fresh-20261024.json">GitHub test record ↗</a>
        <a href="https://github.com/TidelightOrg/tidelight/tree/main/sdk">SDK source ↗</a>
      </div>

      <details className="judge-package-proof-prior">
        <summary>Additional repository verification</summary>
        <p>A separate repository run recorded 266 passing tests, a successful typecheck and production build, and four root dependency advisories (2 moderate, 1 high, 1 critical). See the <a href="/evidence/package-install-verification-20261024.json">repository verification record</a> for its full scope.</p>
      </details>
    </section>
    <section className="judge-section" id="authenticated-research" aria-labelledby="authenticated-research-title">
      <div className="judge-section-heading">
        <div><span className="judge-kicker">AUTHENTICATED RESEARCH · 25 OCT 2026</span><h2 id="authenticated-research-title">Actual runs, inspectable traces.</h2></div>
        <p>Safe request and job IDs are retained. Credentials and private report bodies are excluded. The visual replay below is rendered from actual sanitized stdout; the original timed casts preserve the source events.</p>
      </div>
      <figure className="judge-authenticated-video">
        <video controls playsInline preload="metadata" aria-label="Visual replay of sanitized terminal recordings for Tidelight MCP and SDK research checks">
          <source src="/judge-evidence/authenticated-research-terminal-replay-20261025.mp4" type="video/mp4" />
          Your browser does not support the video element.
        </video>
        <figcaption><span>Visual replay assembled from original sanitized terminal recordings · playback 2×</span><a href="/judge-evidence/authenticated-research-terminal-replay-20261025.mp4" target="_blank" rel="noreferrer">Open video ↗</a></figcaption>
        <p>This is a visual replay of recorded terminal output, not a fresh browser screen capture. Original timed casts, JSON traces, and run limits are linked below.</p>
      </figure>
      <div className="judge-authenticated-grid">
        <article>
          <span className="judge-kicker">PUBLISHED NPM + PYPI · COMPLETE</span>
          <h3>One job across two installed SDKs</h3>
          <p>npm @tidelight/sdk 0.1.2 started AAPL; PyPI tidelight 0.1.2 polled the same job to complete. No source checkout was used for this job.</p>
          <div className="judge-inline-actions">
            <a href="/evidence/authenticated-research-20261025/published-start.json">npm start JSON ↗</a>
            <a href="/evidence/authenticated-research-20261025/published-poll.json">PyPI poll JSON ↗</a>
            <a href="/evidence/authenticated-research-20261025/published-poll.cast">Polling recording ↗</a>
            <a href="/evidence/authenticated-research-20261025/published-sdk-install.json">Versions and integrities ↗</a>
          </div>
        </article>
        <article>
          <span className="judge-kicker">DIRECT HTTP MCP · COMPLETE</span>
          <h3>Authenticated MSFT research</h3>
          <p>Streamable HTTP initialization and discovery returned five tools. The MSFT job progressed through queued, running and complete. This was a direct MCP invocation.</p>
          <div className="judge-inline-actions">
            <a href="/evidence/authenticated-research-20261025/mcp.json">Request and job JSON ↗</a>
            <a href="/evidence/authenticated-research-20261025/mcp.cast">MCP recording ↗</a>
          </div>
        </article>
        <article>
          <span className="judge-kicker">PUBLISHED NPM STDIO · DISCOVERY VERIFIED</span>
          <h3>Installed MCP bridge exposes research</h3>
          <p>@tidelight/mcp 0.1.2 initialized over stdio and listed all five tools, including research start, status and cancel. No extra job was started. Its protocol server reports version 0.1.0.</p>
          <div className="judge-inline-actions">
            <a href="/evidence/authenticated-research-20261025/stdio.json">Stdio discovery JSON ↗</a>
            <a href="/evidence/authenticated-research-20261025/stdio.cast">Stdio recording ↗</a>
            <a href="/evidence/authenticated-research-20261025/install.json">Package integrity ↗</a>
            <a href="/evidence/authenticated-research-20261025/installed-bridge.json">Separate Codex registry ↗</a>
          </div>
          <p>This npm-installed stdio bridge is a separate client from the connected Codex connector. Its tool discovery proves those tools are advertised by the package; the completed MSFT job is recorded under the direct HTTP MCP session.</p>
        </article>
        <article>
          <span className="judge-kicker">SOURCE CHECKOUTS · QUOTA LIMIT RETAINED</span>
          <h3>Earlier NVDA and AAPL runs</h3>
          <p>Python and TypeScript source checkouts started these jobs. Polling hit HTTP 429; later Python SDK reads confirmed both original jobs complete. These starts do not prove published-package execution.</p>
          <div className="judge-inline-actions">
            <a href="/evidence/authenticated-research-20261025/python.json">Python JSON ↗</a>
            <a href="/evidence/authenticated-research-20261025/python.cast">Python recording ↗</a>
            <a href="/evidence/authenticated-research-20261025/javascript-attempt.json">TypeScript JSON ↗</a>
            <a href="/evidence/authenticated-research-20261025/followup.json">Completion reads ↗</a>
          </div>
          <p>TypeScript has an execution report, not a timed recording. The Python recording ends at the quota error; completion reads are separate.</p>
        </article>
      </div>
      <div className="judge-inline-actions"><a href="/judge-evidence/authenticated-research-terminal-replay-20261025.json">Visual replay manifest ↗</a><a href="/evidence/authenticated-research-20261025/README.md">Scope and recorder sources ↗</a><a href="/evidence/authenticated-research-20261025/sha256.json">Original artifact checksums ↗</a><a href="/evidence/authenticated-research-20261025.zip" download>Download evidence ZIP ↗</a></div>
    </section>
    <footer className="judge-footer">
      <p>Historical simulations are not audited results. Research is not investment advice; live execution is not enabled.</p>
      <Link href="/evidence">Evidence manifest <span aria-hidden="true">↗</span></Link>
      <a href="https://status.tidelight.app">Tidelight ecosystem status <span aria-hidden="true">↗</span></a>
    </footer>
  </main>;
}
