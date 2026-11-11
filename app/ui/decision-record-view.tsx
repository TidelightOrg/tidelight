import type { ReactNode } from "react";
import { decisionRecordEarlierHref, decisionRecordHref, type DecisionRecord, type DecisionRecordWindow } from "@/lib/decision-record";

function when(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" })} UTC`;
}

function Entry({ href, title, meta }: { href: string | null; title: string; meta: ReactNode }) {
  const body = <><span className="decision-record-title">{title}</span>{meta ? <span className="decision-record-meta">{meta}</span> : null}</>;
  if (!href) return <li><div>{body}</div></li>;
  return <li><a href={href}>{body}</a></li>;
}

function Earlier({ id, cursors, name, earlier, title }: { id: string; cursors: DecisionRecordWindow; name: keyof DecisionRecordWindow; earlier: string | null; title: string }) {
  if (!earlier) return null;
  return <Entry href={decisionRecordEarlierHref(id, cursors, name, earlier)} title={title} meta={null} />;
}

export function DecisionRecordView({ record, cursors }: { record: DecisionRecord; cursors: DecisionRecordWindow }) {
  const runId = record.researchRun?.id ?? null;
  return <main className="decision-record">
    <h1>{record.researchRun?.question ?? "Decision record"}</h1>
    <ol aria-label="Decision record">
      {record.researchRun ? <Entry href={null} title="Research run" meta={<><code>{record.researchRun.id}</code><span>{record.researchRun.status}</span><time dateTime={record.researchRun.createdAt}>{when(record.researchRun.createdAt)}</time></>} /> : null}
      {record.capsule ? <Entry href={decisionRecordHref.capsule(record.capsule.id)} title="Decision Capsule" meta={<><code>{record.capsule.id}</code><time dateTime={record.capsule.createdAt}>{when(record.capsule.createdAt)}</time></>} /> : null}
      {record.strategyBacktests.items.map(item => <Entry key={item.id} href={runId ? decisionRecordHref.strategy(runId, item.symbol, item.marketCategory) : null} title={`${item.strategyKey} · ${item.symbol} · ${item.interval}`} meta={<><code>{item.id}</code><time dateTime={item.createdAt}>{when(item.createdAt)}</time></>} />)}
      <Earlier id={record.id} cursors={cursors} name="strategiesBefore" earlier={record.strategyBacktests.earlier} title="Earlier strategy backtests" />
      {record.nightwatchSchedules.items.map(item => <Entry key={item.id} href={runId ? decisionRecordHref.nightwatch(runId, item.symbol) : null} title={`${item.label} · ${item.symbol}`} meta={<><code>{item.id}</code><span>{item.playbookKey}</span>{item.enabled ? null : <span>Disabled</span>}</>} />)}
      <Earlier id={record.id} cursors={cursors} name="schedulesBefore" earlier={record.nightwatchSchedules.earlier} title="Earlier Nightwatch schedules" />
      {record.paperDecisions.items.map(item => <Entry key={item.id} href={runId ? decisionRecordHref.nightwatch(runId, item.symbol) : null} title={`${item.symbol} · ${item.signal} · ${item.outcome}`} meta={<><code>{item.id}</code><time dateTime={item.createdAt}>{when(item.createdAt)}</time></>} />)}
      <Earlier id={record.id} cursors={cursors} name="decisionsBefore" earlier={record.paperDecisions.earlier} title="Earlier paper decisions" />
    </ol>
  </main>;
}
