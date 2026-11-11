import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerAuthState } from "@/lib/supabase/auth-user";
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

  let records: DecisionRecordClient;
  try {
    // The cookie client reaches PostgREST as anon when the server session is absent. anon has no select grant, so the read is permission denied. The service role is the same boundary the research desk already uses, and every query still filters user_id.
    records = createAdminClient() as unknown as DecisionRecordClient;
  } catch (error) {
    console.error("Decision record client unavailable", error instanceof Error ? error.message : "unknown");
    return unavailable();
  }

  let record;
  try {
    record = await resolveDecisionRecord({ userId: auth.user.id, user: records, capsules: records }, id, cursors);
  } catch (error) {
    if (error instanceof DecisionRecordUnavailable) return unavailable();
    throw error;
  }
  if (!record) notFound();
  if (record.id.toLowerCase() !== id.toLowerCase()) redirect(`/decisions/${record.id}`);
  return <div className="content-wrap inner-page"><DecisionRecordView record={record} cursors={cursors} /></div>;
}
