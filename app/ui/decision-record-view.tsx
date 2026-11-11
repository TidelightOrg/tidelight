import type { ReactNode } from "react";
import { decisionRecordHref, type DecisionRecord } from "@/lib/decision-record";

function when(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" })} UTC`;
}

function Entry({ href, title, meta }: { href: string | null; title: string; meta: ReactNode }) {
  const body = <><span className="decision-record-title">{title}</span><span className="decision-record-meta">{meta}</span></>;
  if (!href) return <li><div>{body}</div></li>;
  return <li><a href={href}>{body}</a></li>;
}

export function DecisionRecordView({ record }: { record: DecisionRecord }) {
  const runId = record.researchRun?.id ?? null;
  return <main className="decision-record">
    <h1>{record.researchRun?.question ?? "Decision record"}</h1>
    <ol aria-label="Decision record">
      {record.researchRun ? <Entry href={null} title="Research run" meta={<><code>{record.researchRun.id}</code><span>{record.researchRun.status}</span><time dateTime={record.researchRun.createdAt}>{when(record.researchRun.createdAt)}</time></>} /> : null}
      {record.capsule ? <Entry href={decisionRecordHref.capsule(record.capsule.id)} title="Decision Capsule" meta={<><code>{record.capsule.id}</code><time dateTime={record.capsule.createdAt}>{when(record.capsule.createdAt)}</time></>} /> : null}
      {record.strategyBacktests.map(item => <Entry key={item.id} href={runId ? decisionRecordHref.strategy(runId, item.symbol) : null} title={`${item.strategyKey} · ${item.symbol} · ${item.interval}`} meta={<><code>{item.id}</code><time dateTime={item.createdAt}>{when(item.createdAt)}</time></>} />)}
      {record.nightwatchSchedules.map(item => <Entry key={item.id} href={runId ? decisionRecordHref.nightwatch(runId, item.symbol) : null} title={`${item.label} · ${item.symbol}`} meta={<><code>{item.id}</code><span>{item.playbookKey}</span>{item.enabled ? null : <span>Disabled</span>}</>} />)}
      {record.paperDecisions.map(item => <Entry key={item.id} href={runId ? decisionRecordHref.nightwatch(runId, item.symbol) : null} title={`${item.symbol} · ${item.signal} · ${item.outcome}`} meta={<><code>{item.id}</code><time dateTime={item.createdAt}>{when(item.createdAt)}</time></>} />)}
    </ol>
  </main>;
}
