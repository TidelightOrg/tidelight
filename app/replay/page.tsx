import Link from "next/link";
import { researchReplay } from "@/lib/research-replay";
import "./replay.css";

export const metadata = {
  title: "Research replay · Tidelight",
  description: "A clearly labeled static fixture explaining Tidelight's evidence-first research workflow.",
};

export default function ReplayPage() {
  return <main className="replay-page">
    <header className="replay-header"><Link href="/judge">← TIDELIGHT / JUDGE MODE</Link><span>STATIC FIXTURE · NOT LIVE RESEARCH</span></header>
    <section className="replay-hero"><span className="replay-kicker">RESEARCH TRACE / {researchReplay.replay_id}</span><h1>{researchReplay.title}</h1><p>{researchReplay.notice}</p><div className="replay-alert"><b>NO LIVE RESULT</b><span>No sources, claims, quotes, provider data, AI decisions, paper orders, or fills are represented as real in this fixture.</span></div></section>
    <section className="replay-trace" aria-label="Illustrative research steps">{researchReplay.events.map((event,index)=><article key={index} className={`replay-event replay-event-${event.kind}`}><span className="replay-number">{String(index+1).padStart(2,"0")}</span><div><span className="replay-kicker">{"label" in event ? event.label : event.kind.replaceAll("_", " ")}</span>
      {event.kind==="question" ? <p>{event.text}</p> : null}
      {event.kind==="source" ? <><h2>{event.title}</h2><b>{event.publisher}</b><p>{event.summary}</p><a href={event.url} target="_blank" rel="noreferrer">Open primary-source search ↗</a><small>Fixture timestamp—not a captured publication time: {event.captured_at}</small></> : null}
      {event.kind==="claim" ? <><h2>{event.polarity==="supporting"?"Verification rule":"Counterpoint"}</h2><p>{event.text}</p><small>Checklist reference only · no captured source attached</small></> : null}
      {event.kind==="instrument" ? <><h2>{event.symbol} · {event.category}</h2><p>{event.note}</p><small>Instrument state: {event.state.replaceAll("_"," ")}</small></> : null}
      {event.kind==="gate" ? <><h2>Gate not run</h2><ul>{event.reasons.map(reason=><li key={reason}>{reason}</li>)}</ul></> : null}
    </div></article>)}</section>
    <footer className="replay-footer"><Link className="replay-cta" href="/flow?demo=1&question=Verify%20a%20recent%20after-hours%20event%20and%20map%20its%20tokenized%20market">Run the live research workflow ↗</Link><Link href="/evidence">Evidence manifest →</Link></footer>
  </main>;
}
