import type { ReactNode } from "react";
import { decisionRecordEarlierHref, decisionRecordHref, type DecisionRecord, type DecisionRecordWindow } from "@/lib/decision-record";

function when(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" })} UTC`;
}

function Entry({ href, title, meta, external = false }: { href: string | null; title: string; meta: ReactNode; external?: boolean }) {
  const body = <><span className="decision-record-title">{title}</span>{meta ? <span className="decision-record-meta">{meta}</span> : null}</>;
  if (!href) return <li><div>{body}</div></li>;
  return <li><a href={href} {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}>{body}</a></li>;
}

function Earlier({ id, cursors, name, earlier, title }: { id: string; cursors: DecisionRecordWindow; name: keyof DecisionRecordWindow; earlier: string | null; title: string }) {
  if (!earlier) return null;
  return <Entry href={decisionRecordEarlierHref(id, cursors, name, earlier)} title={title} meta={null} />;
}

/** Read-only list of the ids already linked to one research run or capsule. */
export function DecisionRecordView({ record, cursors }: { record: DecisionRecord; cursors: DecisionRecordWindow }) {
  const runId = record.researchRun?.id ?? null;
  return <main className="decision-record">
    <h1>{record.researchRun?.question ?? "Decision record"}</h1>
    <ol aria-label="Decision record">
      {record.researchRun ? <Entry href={null} title="Research run" meta={<><code>{record.researchRun.id}</code><span>{record.researchRun.status}</span><time dateTime={record.researchRun.createdAt}>{when(record.researchRun.createdAt)}</time></>} /> : null}
      {record.evidenceGraph ? <>
        <Entry href={null} title="Evidence graph event" meta={<><code>{record.evidenceGraph.eventId}</code><time dateTime={record.evidenceGraph.asOf}>Captured {when(record.evidenceGraph.asOf)}</time></>} />
        {record.evidenceGraph.subjects.map(subject => <Entry key={subject.id} href={null} title={`${subject.name} · ${subject.ticker}`} meta={<><span>{subject.subjectType === "macro_topic" ? "Macro topic" : "Issuer"}</span><code>{subject.id}</code></>} />)}
        {record.evidenceGraph.instruments.map(instrument => <Entry key={instrument.id} href={null} title={instrument.symbol} meta={<><span>{instrument.marketType === "reality_tokenized_spot" ? "Reality tokenized spot" : "US stock perpetual"}</span><code>{instrument.id}</code></>} />)}
      </> : null}
      {record.capsule ? <Entry href={decisionRecordHref.capsule(record.capsule.id)} title="Decision Capsule" meta={<><code>{record.capsule.id}</code><time dateTime={record.capsule.createdAt}>{when(record.capsule.createdAt)}</time></>} /> : null}
      {record.strategyBacktests.items.map(item => <Entry key={item.id} href={decisionRecordHref.savedStrategyRun(item.id)} title={`${item.strategyKey} · ${item.assetName ?? item.symbol} · ${item.interval}`} meta={<>
        <code>{item.id}</code><time dateTime={item.createdAt}>{when(item.createdAt)}</time>
        <span>{item.assetKind ?? item.marketCategory} · {item.candleCount ?? "—"} candles · {when(item.dataStart)} – {when(item.dataEnd)}</span>
        {item.feeBpsPerSide === null || item.slippageBpsPerSide === null ? <span>Replay costs unavailable</span> : <span>Assumed costs: {item.feeBpsPerSide} bps fee + {item.slippageBpsPerSide} bps slippage per side</span>}
        {item.initialEquity === null ? null : <span>Starting equity ${item.initialEquity.toLocaleString("en-US", { maximumFractionDigits: 2 })}</span>}
        {item.providerTimestamp === null ? null : <time dateTime={new Date(item.providerTimestamp).toISOString()}>Provider observation {when(new Date(item.providerTimestamp).toISOString())}</time>}
        {item.candleFingerprint ? <span>Dataset SHA-256 <code>{item.candleFingerprint}</code></span> : <span>Dataset fingerprint unavailable</span>}
        {item.manifestDigest ? <span>Experiment manifest SHA-256 <code>{item.manifestDigest}</code></span> : null}
        {item.funding === "excluded" ? <span>Funding excluded</span> : null}
      </>} />)}
      <Earlier id={record.id} cursors={cursors} name="strategiesBefore" earlier={record.strategyBacktests.earlier} title="Earlier strategy backtests" />
      {record.nightwatchSchedules.items.map(item => <Entry key={item.id} href={runId ? decisionRecordHref.nightwatch(runId, item.symbol) : null} title={`${item.label} · ${item.symbol}`} meta={<><code>{item.id}</code><span>{item.playbookKey}</span>{item.enabled ? null : <span>Disabled</span>}</>} />)}
      <Earlier id={record.id} cursors={cursors} name="schedulesBefore" earlier={record.nightwatchSchedules.earlier} title="Earlier Nightwatch schedules" />
      {record.nightwatchPreferences ? <Entry href={runId && record.nightwatchPreferences.symbol ? decisionRecordHref.nightwatch(runId, record.nightwatchPreferences.symbol) : null} title="Nightwatch preferences" meta={<><span>Saved trigger preference · {record.nightwatchPreferences.triggerMode === "every_check" ? "every check" : "manual"}</span><span>{record.nightwatchPreferences.symbol ?? "No monitor symbol"} · {record.nightwatchPreferences.playbookKey}</span><span>Signal alerts {record.nightwatchPreferences.alertOnSignal ? "on" : "off"} · fill alerts {record.nightwatchPreferences.alertOnFill ? "on" : "off"}</span></>} /> : null}
      {record.paperDecisions.items.map(item => <Entry key={item.id} href={runId ? decisionRecordHref.nightwatch(runId, item.symbol) : null} title={`${item.symbol} · ${item.signal} · ${item.outcome}`} meta={<><code>{item.id}</code><time dateTime={item.createdAt}>{when(item.createdAt)}</time></>} />)}
      <Earlier id={record.id} cursors={cursors} name="decisionsBefore" earlier={record.paperDecisions.earlier} title="Earlier paper decisions" />
    </ol>
    {record.sources.items.length || record.sources.earlier ? <section aria-labelledby="decision-record-sources"><h2 id="decision-record-sources">Research sources</h2><ol aria-label="Research sources">
      {record.sources.items.map(item => <Entry key={item.id} href={item.href} external title={item.title} meta={<><code>{item.id}</code><span>{item.publisher ?? item.sourceType}</span>{item.publishedAt ? <time dateTime={item.publishedAt}>Published {when(item.publishedAt)}</time> : null}<time dateTime={item.retrievedAt}>Captured {when(item.retrievedAt)}</time></>} />)}
      <Earlier id={record.id} cursors={cursors} name="sourcesBefore" earlier={record.sources.earlier} title="Earlier sources" />
    </ol></section> : null}
    {record.evidence.items.length || record.evidence.earlier ? <section aria-labelledby="decision-record-evidence"><h2 id="decision-record-evidence">Evidence claims</h2><ol aria-label="Evidence claims">
      {record.evidence.items.map(item => <Entry key={item.id} href={item.source?.href ?? null} external title={item.claim} meta={<><span>{item.stance}</span>{item.confidence === null ? null : <span>{Math.round(item.confidence * 100)}% confidence</span>}<time dateTime={item.createdAt}>{when(item.createdAt)}</time>{item.source ? <span>Source: {item.source.title} {item.source.publisher ? `· ${item.source.publisher}` : ""} <code>{item.source.id}</code></span> : <span>Source not retained</span>}</>} />)}
      <Earlier id={record.id} cursors={cursors} name="evidenceBefore" earlier={record.evidence.earlier} title="Earlier claims" />
    </ol></section> : null}
    {record.publicReplays.items.length || record.publicReplays.earlier ? <section aria-labelledby="decision-record-public-replays"><h2 id="decision-record-public-replays">Public research replays</h2><ol aria-label="Public research replays">
      {record.publicReplays.items.map(item => <Entry key={item.id} href={item.status === "active" ? `/replay/${encodeURIComponent(item.id)}` : null} title={`${item.status === "active" ? "Active" : item.status === "revoked" ? "Revoked" : "Expired"} public link`} meta={<><code>{item.id}</code><time dateTime={item.createdAt}>Created {when(item.createdAt)}</time><time dateTime={item.expiresAt}>Expires {when(item.expiresAt)}</time></>} />)}
      <Earlier id={record.id} cursors={cursors} name="publicReplaysBefore" earlier={record.publicReplays.earlier} title="Earlier public replay links" />
    </ol></section> : null}
  </main>;
}
