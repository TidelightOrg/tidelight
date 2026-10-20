import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isTidelightOperator } from "@/lib/auth/operator-access";
import { DeveloperSupportAdmin } from "./support-admin";
import "@/app/developers/support/support.css";
import "./support-admin.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Developer support queue | Tidelight Operations" };

export default async function DeveloperSupportAdminPage({ searchParams }: { searchParams: Promise<{ ticket?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isTidelightOperator(user)) redirect("/overview");
  const params = await searchParams;
  return <main className="content-wrap inner-page tic-support-admin-page">
    <section className="page-heading compact-heading"><div><div className="eyebrow"><span className="eyebrow-line"/> PRIVATE OPERATIONS / SUPPORT</div><h1>Developer <span>support.</span></h1><p>Review conversations across Tidelight, Intelligence Cloud, and Packages.</p></div></section>
    <DeveloperSupportAdmin initialTicket={params.ticket ?? null} operatorEmail={user.email ?? "Operator"} />
  </main>;
}
