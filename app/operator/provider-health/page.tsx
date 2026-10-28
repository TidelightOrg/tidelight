import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerUser } from "@/lib/supabase/auth-user";
import { isTidelightOperator } from "@/lib/auth/operator-access";

export const dynamic = "force-dynamic";
export const metadata = { title: "Provider health | Tidelight operations" };

type ProviderHealthRow = {
  provider: string;
  model: string;
  outcome: string;
  attempt_count: number;
  average_duration_ms: number;
  p95_duration_ms: number;
  latest_at: string;
};

const outcomeLabels: Record<string, string> = {
  success: "Successful response",
  http_error: "HTTP error",
  invalid_response: "Invalid response",
  timeout: "Timeout",
  network_error: "Network error",
};

/** Formats successful provider attempts as a share of all recorded attempts. */
function percent(value: number, total: number) {
  return total ? `${Math.round(value / total * 100)}%` : "—";
}

/** Displays aggregate provider reliability metrics to verified Tidelight operators. */
export default async function ProviderHealthPage() {
  const user = await getServerUser();
  if (!user || !isTidelightOperator(user)) redirect("/overview");

  let data: unknown = null;
  let error: unknown = null;
  try {
    ({ data, error } = await createAdminClient().rpc("get_research_provider_health", { p_days: 30 }));
  } catch (caught) {
    error = caught;
  }
  const rows = (error ? [] : (data ?? [])) as ProviderHealthRow[];
  const total = rows.reduce((sum, row) => sum + Number(row.attempt_count || 0), 0);
  const successes = rows.filter(row => row.outcome === "success").reduce((sum, row) => sum + Number(row.attempt_count || 0), 0);
  const providers = [...new Set(rows.map(row => row.provider))];

  return <main className="content-wrap inner-page">
    <section className="page-heading compact-heading">
      <div><div className="eyebrow"><span className="eyebrow-line" /> PRIVATE OPERATIONS</div><h1>Provider <span>health.</span></h1><p>Aggregate AI synthesis reliability from the last 30 days. No user, research question, or generated content is included.</p></div>
      <Link className="primary-link" href="/operator">← Operator console</Link>
    </section>
    {error ? <div className="action-error" role="status">Provider health data is not available. Confirm the latest Supabase migration has been applied.</div> : null}
    <section className="settings-layout" aria-label="Provider health summary">
      <article className="settings-card"><div className="eyebrow small-eyebrow">RECORDED ATTEMPTS · 30 DAYS</div><h2>{total.toLocaleString()}</h2><p>New measurements start when the application update is deployed.</p></article>
      <article className="settings-card"><div className="eyebrow small-eyebrow">VALID RESPONSES</div><h2>{percent(successes, total)}</h2><p>{successes.toLocaleString()} of {total.toLocaleString()} recorded provider attempts.</p></article>
      <article className="settings-card"><div className="eyebrow small-eyebrow">PROVIDERS OBSERVED</div><h2>{providers.length}</h2><p>{providers.length ? providers.join(" · ") : "No provider attempts recorded yet."}</p></article>
    </section>
    <section className="settings-card" style={{ marginTop: 18 }}>
      <div className="eyebrow small-eyebrow">OUTCOME BREAKDOWN</div>
      <h2>Response reliability</h2>
      {rows.length ? <div className="coverage-table provider-health-table" role="table" aria-label="Provider attempt breakdown">
        <div className="coverage-table-head provider-health-table-head" role="row"><span role="columnheader">Provider / model</span><span role="columnheader">Outcome</span><span role="columnheader">Attempts</span><span role="columnheader">Avg latency</span><span role="columnheader">p95</span></div>
        {rows.map((row, index) => <div className="coverage-row provider-health-row" key={`${row.provider}-${row.model}-${row.outcome}-${index}`}>
          <span role="cell"><strong>{row.provider}</strong><small>{row.model}</small></span>
          <span role="cell">{outcomeLabels[row.outcome] ?? row.outcome}</span>
          <span role="cell">{Number(row.attempt_count).toLocaleString()}</span>
          <span role="cell">{Math.round(Number(row.average_duration_ms)).toLocaleString()} ms</span>
          <span role="cell">{Number(row.p95_duration_ms).toLocaleString()} ms</span>
        </div>)}
      </div> : <div className="settings-empty"><p>{error ? "The aggregate query could not be completed." : "No provider attempts have been recorded during this period."}</p></div>}
      {rows.length ? <p className="settings-footnote">Latest event: {new Date(Math.max(...rows.map(row => Date.parse(row.latest_at) || 0))).toLocaleString("en-US", { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" })} UTC · Attempts are not independent research runs; retries count separately.</p> : null}
    </section>
  </main>;
}
