const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STRATEGY_SYMBOL = /^[A-Z0-9]{2,32}$/;
const NIGHTWATCH_SYMBOL = /^[A-Z0-9]{2,24}USDT$/;
const LINK_LIMIT = 50;

export class DecisionRecordUnavailable extends Error {
  constructor() {
    super("decision-record-unavailable");
    this.name = "DecisionRecordUnavailable";
  }
}

export type DecisionRecordResult = { data: unknown; error: { message: string } | null };

export type DecisionRecordQuery = {
  select(columns: string): DecisionRecordQuery;
  eq(column: string, value: string): DecisionRecordQuery;
  filter(column: string, operator: string, value: string): DecisionRecordQuery;
  order(column: string, options: { ascending: boolean }): DecisionRecordQuery;
  limit(count: number): DecisionRecordQuery & PromiseLike<DecisionRecordResult>;
  maybeSingle(): Promise<DecisionRecordResult>;
};

/** User-scoped reads use the signed-in client. Capsule reads use the server role because authenticated has no table grant. */
export type DecisionRecordClient = { from(table: string): DecisionRecordQuery };

export type DecisionRecordResearchRun = { id: string; question: string; status: string; createdAt: string };
export type DecisionRecordCapsule = { id: string; createdAt: string };
export type DecisionRecordBacktest = { id: string; strategyKey: string; symbol: string; interval: string; createdAt: string };
export type DecisionRecordSchedule = { id: string; label: string; symbol: string; playbookKey: string; enabled: boolean };
export type DecisionRecordPaperDecision = { id: string; symbol: string; signal: string; outcome: string; createdAt: string };

export type DecisionRecord = {
  schemaVersion: 1;
  id: string;
  anchor: "research_run" | "decision_capsule";
  researchRun: DecisionRecordResearchRun | null;
  capsule: DecisionRecordCapsule | null;
  strategyBacktests: DecisionRecordBacktest[];
  nightwatchSchedules: DecisionRecordSchedule[];
  paperDecisions: DecisionRecordPaperDecision[];
};

type DecisionRecordRead = { userId: string; user: DecisionRecordClient; capsules: DecisionRecordClient };

export const decisionRecordHref = {
  capsule(id: string) {
    return UUID.test(id) ? `/api/decision-capsules/${id}` : null;
  },
  strategy(researchRunId: string, symbol: string) {
    if (!UUID.test(researchRunId) || !STRATEGY_SYMBOL.test(symbol)) return null;
    return `/strategies?symbol=${encodeURIComponent(symbol)}&researchRunId=${encodeURIComponent(researchRunId)}`;
  },
  nightwatch(researchRunId: string, symbol: string) {
    if (!UUID.test(researchRunId) || !NIGHTWATCH_SYMBOL.test(symbol)) return null;
    return `/nightwatch?symbol=${encodeURIComponent(symbol)}&researchRunId=${encodeURIComponent(researchRunId)}`;
  },
};

function row(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new DecisionRecordUnavailable();
  return value as Record<string, unknown>;
}

function uuid(value: unknown): string {
  if (typeof value !== "string" || !UUID.test(value)) throw new DecisionRecordUnavailable();
  return value;
}

function text(value: unknown, max: number): string {
  if (typeof value !== "string" || value.length < 1 || value.length > max) throw new DecisionRecordUnavailable();
  return value;
}

function oneOf(value: unknown, allowed: readonly string[]): string {
  if (typeof value !== "string" || !allowed.includes(value)) throw new DecisionRecordUnavailable();
  return value;
}

function flag(value: unknown): boolean {
  if (typeof value !== "boolean") throw new DecisionRecordUnavailable();
  return value;
}

async function single(query: DecisionRecordQuery): Promise<Record<string, unknown> | null> {
  const { data, error } = await query.maybeSingle();
  if (error) throw new DecisionRecordUnavailable();
  return data === null ? null : row(data);
}

async function many(query: DecisionRecordQuery): Promise<Record<string, unknown>[]> {
  const { data, error } = await query.order("created_at", { ascending: false }).limit(LINK_LIMIT);
  if (error || !Array.isArray(data)) throw new DecisionRecordUnavailable();
  return data.map(row);
}

function researchRun(data: Record<string, unknown>): DecisionRecordResearchRun {
  return {
    id: uuid(data.id),
    question: text(data.question, 2000),
    status: oneOf(data.status, ["queued", "collecting", "analyzing", "complete", "failed"]),
    createdAt: text(data.created_at, 80),
  };
}

function capsule(data: Record<string, unknown>): DecisionRecordCapsule {
  return { id: uuid(data.id), createdAt: text(data.created_at, 80) };
}

async function linked(read: DecisionRecordRead, researchRunId: string, saved: DecisionRecordCapsule | null): Promise<Pick<DecisionRecord, "capsule" | "strategyBacktests" | "nightwatchSchedules" | "paperDecisions">> {
  const [savedCapsule, backtests, schedules, decisions] = await Promise.all([
    saved ? Promise.resolve(saved) : single(read.capsules.from("decision_capsules").select("id,created_at").eq("user_id", read.userId).eq("research_run_id", researchRunId)).then(item => item ? capsule(item) : null),
    many(read.user.from("strategy_backtest_runs").select("id,strategy_key,symbol,interval,created_at").eq("user_id", read.userId).filter("parameters->>researchRunId", "ilike", researchRunId)),
    many(read.user.from("nightwatch_schedules").select("id,label,symbol,playbook_key,enabled").eq("user_id", read.userId).eq("research_run_id", researchRunId)),
    many(read.user.from("nightwatch_runs").select("id,symbol,signal,outcome,created_at").eq("user_id", read.userId).filter("snapshot->>researchRunId", "ilike", researchRunId)),
  ]);
  return {
    capsule: savedCapsule,
    strategyBacktests: backtests.map(item => ({
      id: uuid(item.id),
      strategyKey: text(item.strategy_key, 64),
      symbol: text(item.symbol, 32),
      interval: oneOf(item.interval, ["1H", "4H", "1D"]),
      createdAt: text(item.created_at, 80),
    })),
    nightwatchSchedules: schedules.map(item => ({
      id: uuid(item.id),
      label: text(item.label, 64),
      symbol: text(item.symbol, 32),
      playbookKey: text(item.playbook_key, 64),
      enabled: flag(item.enabled),
    })),
    paperDecisions: decisions.map(item => ({
      id: uuid(item.id),
      symbol: text(item.symbol, 32),
      signal: oneOf(item.signal, ["buy", "sell", "hold"]),
      outcome: oneOf(item.outcome, ["executed", "rejected", "no_action"]),
      createdAt: text(item.created_at, 80),
    })),
  };
}

/** Read the signed-in owner's existing research, capsule, strategy, and Nightwatch ids. Does not copy snapshots or write. */
export async function resolveDecisionRecord(read: DecisionRecordRead, id: string): Promise<DecisionRecord | null> {
  if (!UUID.test(id)) return null;
  const runRow = await single(read.user.from("research_runs").select("id,question,status,created_at").eq("id", id).eq("user_id", read.userId));
  if (runRow) {
    const run = researchRun(runRow);
    const links = await linked(read, run.id, null);
    return { schemaVersion: 1, id: run.id, anchor: "research_run", researchRun: run, ...links };
  }

  const capsuleRow = await single(read.capsules.from("decision_capsules").select("id,created_at,research_run_id").eq("id", id).eq("user_id", read.userId));
  if (!capsuleRow) return null;
  const saved = capsule(capsuleRow);
  if (capsuleRow.research_run_id == null) {
    return { schemaVersion: 1, id: saved.id, anchor: "decision_capsule", researchRun: null, capsule: saved, strategyBacktests: [], nightwatchSchedules: [], paperDecisions: [] };
  }
  const linkedRunRow = await single(read.user.from("research_runs").select("id,question,status,created_at").eq("id", uuid(capsuleRow.research_run_id)).eq("user_id", read.userId));
  if (!linkedRunRow) return null;
  const run = researchRun(linkedRunRow);
  const links = await linked(read, run.id, saved);
  return { schemaVersion: 1, id: run.id, anchor: "research_run", researchRun: run, ...links };
}
