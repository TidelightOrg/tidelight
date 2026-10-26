"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/supabase/auth-user";

const tickerPattern = /^[A-Z]{1,6}$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function back(message: string): never { redirect(`/monitor?notice=${encodeURIComponent(message)}`); }

export async function createMonitor(formData: FormData) {
  const user = await getServerUser();
  if (!user) redirect("/login?next=%2Fmonitor");
  const ticker = String(formData.get("ticker") ?? "").trim().toUpperCase();
  const thesis = String(formData.get("thesis") ?? "").trim();
  if (!tickerPattern.test(ticker)) back("Enter a supported US stock ticker using 1–6 letters.");
  if (thesis.length < 12 || thesis.length > 800) back("Write a thesis between 12 and 800 characters.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_research_monitor", { p_ticker: ticker, p_thesis: thesis });
  if (error) back(error.message.includes("limit") ? "You have reached the limit of 12 active monitors." : "The monitor could not be saved. Please try again.");
  revalidatePath("/monitor");
  back(`${ticker} monitor created. Your first review is ready to run.`);
}

export async function updateThesis(formData: FormData) {
  const user = await getServerUser();
  if (!user) redirect("/login?next=%2Fmonitor");
  const id = String(formData.get("monitorId") ?? "");
  const thesis = String(formData.get("thesis") ?? "").trim();
  if (!uuidPattern.test(id) || thesis.length < 12 || thesis.length > 800) back("Check the thesis text and try again.");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_research_monitor_thesis", { p_monitor_id: id, p_thesis: thesis });
  if (error || data === null) back("The thesis revision could not be saved.");
  revalidatePath("/monitor");
  back(`Thesis revision ${data} saved. Earlier revisions remain in the history.`);
}

export async function setMonitorStatus(formData: FormData) {
  const user = await getServerUser();
  if (!user) redirect("/login?next=%2Fmonitor");
  const id = String(formData.get("monitorId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!uuidPattern.test(id) || !["active", "archived"].includes(status)) back("That monitor action is invalid.");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_research_monitor_status", { p_monitor_id: id, p_status: status });
  if (error || data !== true) back("The monitor status could not be updated.");
  revalidatePath("/monitor");
  back(status === "archived" ? "Monitor archived. Its dated history is preserved." : "Monitor restored to your active list.");
}
