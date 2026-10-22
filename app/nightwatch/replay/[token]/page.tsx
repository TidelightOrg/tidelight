import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nightwatch paper trade replay · Tidelight", description: "An owner-published Nightwatch paper trade replay.", robots: { index: false, follow: false } };

type ReplayPayload = { schemaVersion: number; market: { symbol: string; side: string; quantity: number; referencePrice: number; fillPrice: number; notional: number; fee: number; realizedPnl: number | null; filledAt: string }; decision: { signal: string; outcome: string; reason: string; asOf: string; referencePrice: number; fastSma: number; slowSma: number; playbook: string | null; confidence: number | null; rationale: string | null; evidence: string[]; risks: string[]; invalidation: string | null; horizon: string | null }; assumptions: { feeRate: string; adverseSlippage: string; venueOrderSent: false }; notice: string };
const usd = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 6 }).format(value);

export default async function NightwatchPublicReplay({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) notFound();
  const db = await createClient();
  const { data } = await db.from("public_nightwatch_replays").select("payload,expires_at").eq("public_id", token).is("revoked_at", null).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (!data) notFound();
  const replay = data.payload as ReplayPayload;
  if (replay?.schemaVersion !== 1 || !replay.market || !replay.decision || !Array.isArray(replay.decision.evidence) || !Array.isArray(replay.decision.risks)) notFound();
  const { market, decision } = replay;
  return <main className="nw-public-replay-page nw-public-replay-detail">
    <header><Link href="/judge">TIDELIGHT / JUDGE MODE</Link><span>OWNER-PUBLISHED · EXPIRES {new Date(data.expires_at).toLocaleDateString()}</span></header>
    <section className="nw-public-replay-hero"><span className="eyebrow">NIGHTWATCH / PAPER REPLAY</span><h1>{market.symbol}<br/><em>{market.side.toUpperCase()} fill</em></h1><p>{replay.notice}</p><div className="nw-public-replay-meta"><span>Filled<b>{new Date(market.filledAt).toLocaleString()}</b></span><span>Decision<b>{decision.outcome.replaceAll("_", " ")}</b></span><span>Signal<b>{decision.signal.toUpperCase()}</b></span></div></section>
    <section className="nw-public-replay-facts" aria-label="Paper fill details">{[["Quantity", market.quantity.toLocaleString(undefined, { maximumFractionDigits: 8 })], ["Reference price", usd(market.referencePrice)], ["Simulated fill", usd(market.fillPrice)], ["Notional", usd(market.notional)], ["Simulated fee", usd(market.fee)], ["Realized P&L", market.realizedPnl === null ? "Open position" : usd(market.realizedPnl)]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</section>
    <section className="nw-public-replay-section"><div><span className="eyebrow">DECISION RECORD</span><h2>Why the agent acted</h2><p>{decision.rationale ?? decision.reason}</p></div><div className="nw-public-replay-data"><div><span>Playbook</span><b>{decision.playbook ?? "Default rules"}</b></div><div><span>Confidence</span><b>{decision.confidence === null ? "Unavailable" : `${Math.round(decision.confidence * 100)}% · model-reported`}</b></div><div><span>Completed candle</span><b>{new Date(decision.asOf).toLocaleString()}</b></div><div><span>20 / 50 SMA</span><b>{usd(decision.fastSma)} / {usd(decision.slowSma)}</b></div>{decision.horizon ? <div><span>Horizon</span><b>{decision.horizon}</b></div> : null}{decision.invalidation ? <div><span>Invalidation</span><b>{decision.invalidation}</b></div> : null}</div></section>
    {decision.evidence.length ? <section className="nw-public-replay-section"><div><span className="eyebrow">EVIDENCE</span><h2>Observed inputs</h2></div><ul>{decision.evidence.map((item, index) => <li key={index}>{item}</li>)}</ul></section> : null}
    {decision.risks.length ? <section className="nw-public-replay-section"><div><span className="eyebrow">RISK CHECK</span><h2>Recorded risks</h2></div><ul>{decision.risks.map((item, index) => <li key={index}>{item}</li>)}</ul></section> : null}
    <section className="nw-public-replay-assumptions"><span>SIMULATION ASSUMPTIONS</span><b>Fee {replay.assumptions.feeRate} · Adverse slippage {replay.assumptions.adverseSlippage} · Exchange order sent: no</b><p>The replay shows one simulated fill and its decision context. It excludes account balances, identity, and unrelated ledger records. Past and simulated outcomes do not predict future results.</p></section>
    <footer><Link href="/nightwatch/replays">All public Nightwatch replays →</Link><Link href="/judge">Return to judge mode →</Link></footer>
  </main>;
}
