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
  const { data } = user ? await supabase.from("watchlist_items").select("symbol").order("created_at", { ascending: true }).limit(12) : { data: null };
  const favorites = (data ?? []).map((item) => item.symbol.replace(/^R/i, "").replace(/USDT$/i, "").toUpperCase()).filter((ticker) => /^[A-Z]{1,6}$/.test(ticker));
  return <AgentFlowDesk initialQuestion={initialQuestion.slice(0, 280)} favorites={favorites} evaluatorMode={demo === "1"} />;
}
