import type { Metadata } from "next";
import { PlatformNav } from "../platform-nav";
import { createClient } from "@/lib/supabase/server";
import { SupportCenter } from "./support-center";
import "../tidelight-developers.css";
import "../platform-polish.css";
import "../packages/packages.css";
import "./support.css";
import { getServerUser } from "@/lib/supabase/auth-user";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { absolute: "Developer Support — Tidelight" },
  description: "Get human help with the Tidelight developer platform, APIs, MCP, and official packages.",
};

export default async function DeveloperSupportPage({ searchParams }: { searchParams: Promise<{ ecosystem?: string; ticket?: string; new?: string }> }) {
  const params = await searchParams;
  const ecosystem = params.ecosystem === "tidelight" || params.ecosystem === "packages" ? params.ecosystem : "intelligence";
  const supabase = await createClient();
  const user = await getServerUser();
  return <main className="tic tic-landing tic-support-page">
    <PlatformNav active="support" ecosystem={ecosystem} />
    <SupportCenter signedIn={Boolean(user)} email={user?.email ?? null} initialEcosystem={params.ecosystem} initialTicket={params.ticket} initialCompose={params.new === "incident" && Boolean(user)} reportIntent={params.new === "incident"} />
  </main>;
}
