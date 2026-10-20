import Link from "next/link";
import "./hackathon.css";

const tracks = [
  {
    number: "01",
    name: "Alpha Factory",
    title: "A reproducible rToken replay",
    body: "Start from completed Bitget candles, choose a deterministic strategy, and inspect the train, holdout, walk-forward, and cost-sensitivity result before trusting a signal.",
    href: "/strategies",
    action: "Open Strategy Lab",
    state: "Implemented",
  },
  {
    number: "02",
    name: "Agentic Trading",
    title: "A bounded decision loop",
    body: "Nightwatch turns a completed-candle observation into an explainable paper decision, with freshness, sizing, loss, exposure, pause, and duplicate checks recorded around it.",
    href: "/nightwatch",
    action: "Open Nightwatch",
    state: "Implemented",
  },
  {
    number: "03",
    name: "AI Trading Desk",
    title: "Research before reaction",
    body: "Agent Flow connects a question to captured sources, claims, counterpoints, affected assets, uncertainty, and a trade gate that can explicitly say no trade.",
    href: "/flow?demo=1",
    action: "Run Agent Flow",
    state: "Implemented",
  },
];

const path = [
  ["01", "Frame the question", "Use the demo prompt to establish the overnight event and the decision we are trying to make."],
  ["02", "Trace the evidence", "Inspect source capture, claim support, source diversity, counterpoints, and freshness before any strategy is considered."],
  ["03", "Replay the idea", "Run the deterministic strategy against a completed-candle archive with a chronological holdout and cost assumptions."],
  ["04", "Watch the boundary", "Open Nightwatch to see how the same lineage is converted into a paper-only decision with hard risk gates."],
];

const proof = [
  ["Source of truth", "Bitget public market data", "Completed candles, asset eligibility, freshness, and honest unavailable states are kept visible."],
  ["Reproducibility", "Archived inputs + fingerprint", "Strategy runs retain the candle archive, parameters, split, costs, and a SHA-256 input fingerprint."],
  ["Safety", "Paper-only by default", "No live order is implied by this page. Pause, stale, exposure, daily-loss, sizing, and duplicate guards remain explicit."],
];

export const metadata = {
  title: "Bitget S2 | Tidelight",
  description: "Tidelight's judge-ready Bitget AI Base Camp S2 path.",
};

export default function HackathonS2Page() {
  return (
    <main className="s2-page">
      <div className="s2-grid" aria-hidden="true" />
      <header className="s2-nav">
        <Link className="s2-brand" href="/">
          <span className="s2-brand-mark">T</span>
          <span>Tidelight</span>
        </Link>
        <div className="s2-nav-meta">
          <span>BITGET AI BASE CAMP</span>
          <span className="s2-nav-dot" />
          <span>S2 / JUDGE PREVIEW</span>
        </div>
        <Link className="s2-nav-link" href="/status">System status ↗</Link>
      </header>

      <section className="s2-hero">
        <div className="s2-hero-copy">
          <p className="s2-eyebrow"><span /> After-hours intelligence, made inspectable.</p>
          <h1>From the overnight event <em>to the decision you can inspect.</em></h1>
          <p className="s2-lede">
            Tidelight is an evidence-first workspace for Bitget Real-World Asset markets:
            research the event, replay the strategy, and watch a bounded paper agent make—or refuse—a decision.
          </p>
          <div className="s2-actions">
            <Link className="s2-primary" href="/flow?demo=1">Run the 3-minute path <span>↗</span></Link>
            <Link className="s2-secondary" href="/research">Open the research desk</Link>
          </div>
          <div className="s2-hero-meta">
            <span>PUBLIC BITGET DATA</span>
            <span>•</span>
            <span>COMPLETED CANDLES</span>
            <span>•</span>
            <span>PAPER-ONLY EXECUTION</span>
          </div>
        </div>
        <div className="s2-signal" aria-label="Tidelight decision chain">
          <div className="s2-signal-line s2-signal-line-a" />
          <div className="s2-signal-line s2-signal-line-b" />
          <div className="s2-signal-node s2-signal-event"><small>01 / EVENT</small><strong>Overnight<br />signal</strong><span>captured</span></div>
          <div className="s2-signal-node s2-signal-evidence"><small>02 / EVIDENCE</small><strong>Source-bound<br />thesis</strong><span>qualified</span></div>
          <div className="s2-signal-node s2-signal-decision"><small>03 / DECISION</small><strong>Paper action<br />or no trade</strong><span>guarded</span></div>
          <div className="s2-signal-caption">ONE LINEAGE / THREE TRACKS</div>
        </div>
      </section>

      <section className="s2-section s2-section-tight">
        <div className="s2-section-heading">
          <p className="s2-eyebrow"><span /> The judge path</p>
          <h2>See the whole thesis in one sitting.</h2>
          <p>Every step opens the existing product surface that owns the evidence. No simulated result is presented here.</p>
        </div>
        <div className="s2-path">
          {path.map(([number, title, body]) => (
            <article className="s2-path-step" key={number}>
              <span className="s2-step-number">{number}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="s2-section">
        <div className="s2-section-heading s2-heading-row">
          <div>
            <p className="s2-eyebrow"><span /> One product, three entries</p>
            <h2>Choose the proof you want to inspect.</h2>
          </div>
          <span className="s2-status-pill"><i /> Live product surfaces</span>
        </div>
        <div className="s2-track-grid">
          {tracks.map((track) => (
            <article className="s2-track-card" key={track.number}>
              <div className="s2-track-top"><span>{track.number}</span><b>{track.state}</b></div>
              <p className="s2-track-name">{track.name}</p>
              <h3>{track.title}</h3>
              <p>{track.body}</p>
              <Link href={track.href}>{track.action} <span>↗</span></Link>
            </article>
          ))}
        </div>
      </section>

      <section className="s2-section s2-proof-section">
        <div className="s2-section-heading">
          <p className="s2-eyebrow"><span /> What can be verified</p>
          <h2>Trust is a product surface.</h2>
          <p>The implementation keeps the important boundaries visible instead of hiding them behind a confident summary.</p>
        </div>
        <div className="s2-proof-grid">
          {proof.map(([label, title, body]) => (
            <article className="s2-proof-card" key={label}>
              <span className="s2-proof-label">{label}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="s2-section s2-close-section">
        <div className="s2-close-copy">
          <p className="s2-eyebrow"><span /> Submission status</p>
          <h2>Strong foundations. Honest remaining proof.</h2>
          <p>
            The product workflows are implemented. The remaining competition-grade work is empirical:
            keep a timestamped natural paper run, publish the dated strategy report, and attach the final submission materials.
            This preview does not claim those artifacts exist yet.
          </p>
        </div>
        <div className="s2-close-actions">
          <Link className="s2-primary" href="/demo">Open the product demo <span>↗</span></Link>
          <a className="s2-secondary" href="/hackathon/s2-evidence.json">Read the evidence manifest</a>
        </div>
      </section>

      <footer className="s2-footer">
        <span>TIDELIGHT / BITGET S2</span>
        <span>Evidence first. Guardrails visible.</span>
        <Link href="/">Back to Tidelight ↗</Link>
      </footer>
    </main>
  );
}
