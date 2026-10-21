import AgentFlowDesk from "@/app/ui/agent-flow-desk";
import "./flow.css";

export const metadata = {
  title: "Market research · Tidelight",
  description: "Research tokenized US equities through current evidence, market context, exposure, and clear decision gates.",
};

export default async function FlowPage({ searchParams }: { searchParams: Promise<{ q?: string; question?: string; demo?: string }> }) {
  const { q, question, demo } = await searchParams;
  const initialQuestion = question || q || "";
  return <AgentFlowDesk initialQuestion={initialQuestion.slice(0, 280)} evaluatorMode={demo === "1"} />;
}
