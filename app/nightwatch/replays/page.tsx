import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nightwatch paper trade replays · Tidelight", description: "Public Nightwatch paper replays with decision context and simulation assumptions.", robots: { index: false, follow: false } };

export default async function NightwatchReplayDirectory() {
  const db = await createClient();
  const { data } = await db.from("public_nightwatch_replays").select("public_id,payload,created_at,expires_at").is("revoked_at", null).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(50);
  const replays = (data ?? []).map((row) => {
    const payload = row.payload as { market?: { symbol?: string; side?: string }; decision?: { outcome?: string } };
    return { url: `/nightwatch/replay/${row.public_id}`, symbol: payload.market?.symbol ?? "Paper market", side: payload.market?.side ?? "fill", outcome: payload.decision?.outcome ?? "recorded", createdAt: row.created_at, expiresAt: row.expires_at };
  });
  return <main className="nw-public-replay-page">
    <header><Link href="/judge">TIDELIGHT / JUDGE MODE</Link><span>PUBLIC REPLAYS</span></header>
    <section className="nw-public-replay-hero"><span className="eyebrow">NIGHTWATCH / PAPER TRADE REPLAYS</span><h1>Recorded decisions.<br/><em>Clear assumptions.</em></h1><p>Account holders can publish a sanitized simulated fill with its decision context. Listings are public and discoverable from Judge Mode and the repository README; private account details and unrelated ledger activity are excluded.</p></section>
    <section className="nw-public-replay-list" aria-label="Public Nightwatch paper replays">{replays.length ? replays.map((item) => <Link href={item.url} key={item.url} className="nw-public-replay-card"><span>{item.symbol} · PAPER {item.side.toUpperCase()}</span><strong>{item.outcome.replaceAll("_", " ")}</strong><small>Published {new Date(item.createdAt).toLocaleDateString()} · expires {new Date(item.expiresAt).toLocaleDateString()}</small><em>Open replay ↗</em></Link>) : <div className="nw-public-replay-empty"><strong>No public trade replays yet.</strong><p>Nightwatch fills stay private unless an account holder shares a sanitized replay.</p><Link href="/nightwatch">Open Nightwatch →</Link></div>}</section>
    <footer>Paper simulation · no exchange order was sent · not investment advice.<Link href="/judge">Return to judge mode →</Link></footer>
  </main>;
}
