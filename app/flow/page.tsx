import AgentFlowDesk from "@/app/ui/agent-flow-desk";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/supabase/auth-user";
import "./flow.css";

export const metadata = {
  title: "Market research · Tidelight",
  description: "Research tokenized US equities through current evidence, market context, exposure, and clear decision gates.",
};

export default async function FlowPage({ searchParams }: { searchParams: Promise<{ q?: string; question?: string; demo?: string; monitorId?: string; monitorRevision?: string }> }) {
  const { q, question, demo, monitorId, monitorRevision } = await searchParams;
  const initialQuestion = question || q || "";
  const supabase = await createClient();
  const user = await getServerUser();
  const [watchlistResult, historyResult] = user ? await Promise.all([
    supabase.from("watchlist_items").select("symbol").order("created_at", { ascending: true }).limit(12),
    supabase.from("research_runs").select("question, summary").eq("user_id", user.id).eq("event_type", "agent_flow").eq("status", "complete").order("created_at", { ascending: false }).limit(8),
  ]) : [{ data: null }, { data: null }];
  let ownedMonitor: { id: string; ticker: string; thesis: string; revision: number } | null = null;
  if (user && monitorId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(monitorId)) {
    const { data: monitor } = await supabase.from("research_monitors").select("id,ticker,thesis,thesis_revision").eq("id", monitorId).eq("user_id", user.id).eq("status", "active").maybeSingle();
    if (monitor) {
      const requestedRevision = monitorRevision && /^\d+$/.test(monitorRevision) ? Number(monitorRevision) : monitor.thesis_revision;
      const { data: revision } = await supabase.from("research_monitor_thesis_revisions").select("revision,thesis").eq("monitor_id", monitor.id).eq("user_id", user.id).eq("revision", requestedRevision).maybeSingle();
      if (revision) ownedMonitor = { id: monitor.id, ticker: monitor.ticker, thesis: revision.thesis, revision: revision.revision };
    }
  }
  const favorites = (watchlistResult.data ?? []).map((item) => item.symbol.replace(/^R/i, "").replace(/USDT$/i, "").toUpperCase()).filter((ticker) => /^[A-Z]{1,6}$/.test(ticker));
  const recentQuestions = (historyResult.data ?? []).flatMap((run) => {
    const question = typeof run.question === "string" ? run.question.trim().replace(/\s+/g, " ").slice(0, 220) : "";
    if (question.length < 5) return [];
    const summary = run.summary && typeof run.summary === "object" && !Array.isArray(run.summary) ? run.summary as Record<string, unknown> : {};
    const assets = Array.isArray(summary.assets) ? summary.assets : [];
    const tickers = assets.flatMap((asset) => {
      if (!asset || typeof asset !== "object" || Array.isArray(asset)) return [];
      const value = (asset as Record<string, unknown>).ticker;
      if (typeof value !== "string") return [];
      const ticker = value.toUpperCase().replace(/^R/, "").replace(/USDT$/, "");
      return /^[A-Z]{1,6}$/.test(ticker) ? [ticker] : [];
    });
    return [{ question, tickers: [...new Set(tickers)] }];
  });
  const seededQuestion = ownedMonitor ? `For ${ownedMonitor.ticker}, evaluate this thesis: ${ownedMonitor.thesis}` : initialQuestion;
  return <AgentFlowDesk initialQuestion={seededQuestion.slice(0, 500)} initialMonitorId={ownedMonitor?.id ?? null} initialMonitorRevision={ownedMonitor?.revision ?? null} favorites={favorites} recentQuestions={recentQuestions} evaluatorMode={demo === "1"} />;
}
