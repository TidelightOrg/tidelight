import Link from "next/link";
import type { Metadata } from "next";
import manifest from "@/public/evidence/manifest.json";
import "./evidence.css";
import { ThemeQuickSwitch } from "@/app/ui/theme-provider";

export const metadata: Metadata = {
  title: "Evidence manifest · Tidelight",
  description: "A public, machine-readable index of Tidelight's reproducible evidence and its limitations.",
};

function Status({ value }: { value: string }) {
  const label = value.replaceAll("_", " ");
  return <span className={`evidence-status evidence-status-${value}`}>{label}</span>;
}

export default function EvidencePage() {
  return <main className="evidence-page">
    <header className="evidence-header">
      <Link className="evidence-brand" href="/judge">← TIDELIGHT / JUDGE MODE</Link>
      <div className="evidence-header-actions"><ThemeQuickSwitch/><a className="evidence-download" href="/evidence/manifest.json" download>Download JSON ↗</a></div>
    </header>
    <section className="evidence-hero">
      <span className="evidence-kicker">EVIDENCE &amp; VERIFICATION · {manifest.schema_version}</span>
      <h1>Public evidence and verification paths.</h1>
      <p>Review the public artifacts, account-scoped records, and reproducibility criteria associated with Tidelight’s S2 submission.</p>
      <div className="evidence-note"><b>Scope</b><span>{manifest.evidence_boundary.note}</span></div>
    </section>
    <section className="evidence-section">
      <div className="evidence-section-head"><span className="evidence-kicker">EVIDENCE INVENTORY</span><h2>Evidence inventory</h2></div>
      <div className="evidence-table">
        {manifest.evidence_inventory.map((item) => <article key={item.id}>
          <div className="evidence-item-top"><span className="evidence-kind">{item.kind.replaceAll("_", " ")}</span><Status value={item.status}/></div>
          <h3>{item.id.replaceAll("-", " ")}</h3>
          <p>{item.claim}</p>
          <a href={item.uri} target="_blank" rel="noreferrer">{item.uri.replace("https://", "")} ↗</a>
        </article>)}
      </div>
    </section>
    <section className="evidence-section evidence-grid">
      <article><span className="evidence-kicker">ALPHA FACTORY</span><h2>Strategy report</h2><Status value={manifest.verification.reproducibility.alpha.status}/><ul>{manifest.verification.reproducibility.alpha.requirements.map((x)=><li key={x}>{x}</li>)}</ul><p>Independent reproduction requires the run data, out-of-sample window, cost assumptions, and raw trade artifacts listed here.</p></article>
      <article><span className="evidence-kicker">AGENTIC TRADING</span><h2>Paper run export</h2><Status value={manifest.verification.reproducibility.agentic.status}/><ul>{manifest.verification.reproducibility.agentic.requirements.map((x)=><li key={x}>{x}</li>)}</ul><p>Ledger records are available to the owning account; the public index lists the export requirements.</p></article>
      <article><span className="evidence-kicker">AI TRADING DESK</span><h2>Research replay</h2><Status value={manifest.verification.reproducibility.research.status}/><ul>{manifest.verification.reproducibility.research.requirements.map((x)=><li key={x}>{x}</li>)}</ul><p>Account-owned research runs can be published as sanitized, time-limited replays after owner approval.</p></article>
    </section>
    <footer className="evidence-footer"><span>Generated {manifest.generated_at} · Source repository</span><a href={manifest.verification.source_repository} target="_blank" rel="noreferrer">TidelightOrg/tidelight ↗</a><Link href="/judge">Back to Judge Mode →</Link></footer>
  </main>;
}
