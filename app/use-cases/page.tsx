import type { Metadata } from "next";
import Link from "next/link";
import LandingUseCases from "@/app/ui/landing-use-cases";

export const metadata: Metadata = {
  title: "Use cases | Tidelight",
  description: "Explore source-led Tidelight workflows for company events, tokenized markets, macro context, and decision review.",
};

export default function UseCasesPage() {
  return <main className="landing-page use-cases-page">
    <nav className="landing-nav" aria-label="Tidelight use cases navigation">
      <Link className="landing-brand" href="/"><span className="landing-mark" aria-hidden="true">≈</span><span>tide<span>light</span></span></Link>
      <div className="landing-nav-actions"><div className="landing-nav-links"><Link href="/">Home</Link><Link href="/developers">Developers</Link><Link href="/judge">Judge Mode</Link><Link className="landing-nav-workspace" href="/overview">Open workspace</Link></div></div>
    </nav>
    <header className="use-cases-page-intro">
      <span className="landing-kicker"><i /> TIDELIGHT RESEARCH PATHS</span>
      <h1>Eight ways in.<br /><em>One connected view.</em></h1>
      <p>Explore source-led workflows for company events, tokenized markets, macro context, and decision review. Refine the question before research begins, then inspect the sources and market context behind each result.</p>
      <div className="use-cases-page-proof"><span>01 / Source-linked</span><span>02 / Risk-aware</span><span>03 / Owner-controlled</span></div>
    </header>
    <LandingUseCases />
    <footer className="use-cases-page-footer"><span>Every path stays connected to its evidence.</span><Link href="/">Return to Tidelight <span aria-hidden="true">↗</span></Link></footer>
  </main>;
}
