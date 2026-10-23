import AgentFlowDesk from "@/app/ui/agent-flow-desk";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/supabase/auth-user";
import "./flow.css";

export const metadata = {
  title: "Market research · Tidelight",
  description: "Research tokenized US equities through current evidence, market context, exposure, and clear decision gates.",
};

export default async function FlowPage({ searchParams }: { searchParams: Promise<{ q?: string; question?: string; demo?: string }> }) {
  const { q, question, demo } = await searchParams;
  const initialQuestion = question || q || "";
  const supabase = await createClient();
  const user = await getServerUser();
  const [watchlistResult, historyResult] = user ? await Promise.all([
    supabase.from("watchlist_items").select("symbol").order("created_at", { ascending: true }).limit(12),
    supabase.from("research_runs").select("question, summary").eq("user_id", user.id).eq("event_type", "agent_flow").eq("status", "complete").order("created_at", { ascending: false }).limit(8),
  ]) : [{ data: null }, { data: null }];
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
  return <AgentFlowDesk initialQuestion={initialQuestion.slice(0, 280)} favorites={favorites} recentQuestions={recentQuestions} evaluatorMode={demo === "1"} />;
}
