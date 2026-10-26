import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/supabase/auth-user";
import ResearchMonitor from "@/app/ui/research-monitor";
import "./monitor.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Research Monitor · Tidelight", description: "Follow an investment thesis through dated, source-linked research reviews and evidence changes." };

export default async function MonitorPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const user = await getServerUser();
  if (!user) redirect("/login?next=%2Fmonitor");
  const supabase = await createClient();
  const [{ data: monitors, error: monitorError }, { data: revisions, error: revisionError }, { data: observations, error: observationError }] = await Promise.all([
    supabase.from("research_monitors").select("id,ticker,thesis,thesis_revision,status,created_at,updated_at").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(24),
    supabase.from("research_monitor_thesis_revisions").select("monitor_id,revision,thesis,created_at").eq("user_id", user.id).order("revision", { ascending: false }).limit(240),
    supabase.from("research_monitor_observations").select("id,monitor_id,research_run_id,thesis_revision,observed_at").eq("user_id", user.id).order("observed_at", { ascending: false }).limit(240),
  ]);
  const runIds = [...new Set((observations ?? []).map((row) => row.research_run_id))];
  const { data: runs } = runIds.length ? await supabase.from("research_runs").select("id,question,summary,created_at,completed_at").eq("user_id", user.id).in("id", runIds) : { data: [] as Array<Record<string, unknown>> };
  const notice = (await searchParams).notice;
  return <div className="content-wrap inner-page monitor-page">
    <header className="monitor-page-head"><div><div className="monitor-eyebrow"><i/> TIDELIGHT / CONTINUOUS RESEARCH</div><h1>Research, with a memory.</h1><p>Follow the thesis, revisit the evidence, and see what changed between reviews. Each run uses the existing research gates; a saved view is not a verified conclusion.</p></div><Link className="monitor-head-link" href="/flow">Open research desk <span>↗</span></Link></header>
    {monitorError || revisionError || observationError ? <section className="monitor-system-note" role="alert"><b>Your research memory is temporarily unavailable.</b><span>Reload in a moment. Your saved work has not been changed.</span></section> : <ResearchMonitor monitors={monitors ?? []} revisions={revisions ?? []} observations={observations ?? []} runs={(runs ?? []) as never[]} notice={notice ?? ""} />}
  </div>;
}
