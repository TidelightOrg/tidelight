import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/auth-user";
import { isTidelightOperator } from "@/lib/auth/operator-access";
import { getOperatorEditorialContent } from "@/lib/tic/editorial-content";
import { CommunicationsEditor } from "./editor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Status and publishing | Tidelight operator" };

export default async function OperatorCommunicationsPage() {
  const user = await getServerUser();
  if (!user || !isTidelightOperator(user)) redirect("/overview");
  const content = await getOperatorEditorialContent();
  return <main className="content-wrap inner-page">
    <section className="page-heading compact-heading">
      <div><div className="eyebrow"><span className="eyebrow-line" /> OPERATOR PUBLISHING</div><h1>Status and <span>stories.</span></h1>
        <p>Publish maintenance notices for the status page and manage public Tidelight Field Notes.</p></div>
    </section>
    <CommunicationsEditor initialMaintenance={content.maintenance} initialPosts={content.posts} />
  </main>;
}
