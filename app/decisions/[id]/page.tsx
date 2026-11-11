import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerAuthState } from "@/lib/supabase/auth-user";
import { createClient } from "@/lib/supabase/server";
import { DecisionRecordUnavailable, decisionRecordCursor, resolveDecisionRecord, type DecisionRecordClient } from "@/lib/decision-record";
import { DecisionRecordView } from "@/app/ui/decision-record-view";
import "./decision-record.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Decision record · Tidelight", robots: { index: false, follow: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function unavailable() {
  return <main className="content-wrap inner-page decision-record"><h1>Decision record</h1><p role="alert">This record could not be loaded.</p></main>;
}

export default async function DecisionRecordPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ strategiesBefore?: string; schedulesBefore?: string; decisionsBefore?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const cursors = { strategiesBefore: decisionRecordCursor(query.strategiesBefore), schedulesBefore: decisionRecordCursor(query.schedulesBefore), decisionsBefore: decisionRecordCursor(query.decisionsBefore) };
  if (!UUID.test(id)) notFound();
  const auth = await getServerAuthState();
  if (auth.errorCode) return <main className="content-wrap inner-page decision-record"><h1>Decision record</h1><p role="alert">Sign-in could not be verified.</p></main>;
  if (!auth.user) redirect(`/login?next=${encodeURIComponent(`/decisions/${id}`)}`);

  let user: DecisionRecordClient;
  let capsules: DecisionRecordClient;
  try {
    user = await createClient() as unknown as DecisionRecordClient;
    capsules = createAdminClient() as unknown as DecisionRecordClient;
  } catch {
    return unavailable();
  }

  let record;
  try {
    record = await resolveDecisionRecord({ userId: auth.user.id, user, capsules }, id, cursors);
  } catch (error) {
    if (error instanceof DecisionRecordUnavailable) return unavailable();
    throw error;
  }
  if (!record) notFound();
  if (record.id.toLowerCase() !== id.toLowerCase()) redirect(`/decisions/${record.id}`);
  return <div className="content-wrap inner-page"><DecisionRecordView record={record} cursors={cursors} /></div>;
}
