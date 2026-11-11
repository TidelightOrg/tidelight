import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  DecisionRecordUnavailable,
  decisionRecordHref,
  resolveDecisionRecord,
} from "../lib/decision-record.ts";

const owner = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const runId = "33333333-3333-4333-8333-333333333333";
const otherRun = "44444444-4444-4444-8444-444444444444";
const capsuleId = "55555555-5555-4555-8555-555555555555";
const otherCapsule = "66666666-6666-4666-8666-666666666666";
const orphanCapsule = "77777777-7777-4777-8777-777777777777";
const backtestId = "88888888-8888-4888-8888-888888888888";
const otherBacktest = "99999999-9999-4999-8999-999999999999";
const scheduleId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const paperId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const rows = {
  research_runs: [
    { id: runId, user_id: owner, question: "What changed for NVDA?", status: "complete", created_at: "2026-11-02T00:00:00.000Z", summary: { secret: true } },
    { id: otherRun, user_id: other, question: "Other account", status: "complete", created_at: "2026-11-02T00:00:00.000Z", summary: { secret: true } },
  ],
  decision_capsules: [
    { id: capsuleId, user_id: owner, research_run_id: runId, created_at: "2026-11-02T01:00:00.000Z", original_snapshot: { copied: true }, integrity_hash: "a".repeat(64) },
    { id: otherCapsule, user_id: other, research_run_id: otherRun, created_at: "2026-11-02T01:00:00.000Z", original_snapshot: { copied: true }, integrity_hash: "b".repeat(64) },
    { id: orphanCapsule, user_id: owner, research_run_id: null, created_at: "2026-11-03T01:00:00.000Z", original_snapshot: { copied: true }, integrity_hash: "c".repeat(64) },
  ],
  strategy_backtest_runs: [
    { id: backtestId, user_id: owner, strategy_key: "sma_trend_v1", symbol: "RNVDAUSDT", interval: "4H", created_at: "2026-11-02T02:00:00.000Z", parameters: { researchRunId: runId.toUpperCase(), candles: [1], feeBpsPerSide: 10 }, train_metrics: { returnPct: 1 }, candles: [1] },
    { id: otherBacktest, user_id: other, strategy_key: "sma_trend_v1", symbol: "RNVDAUSDT", interval: "4H", created_at: "2026-11-02T02:00:00.000Z", parameters: { researchRunId: runId, candles: [1] }, candles: [9] },
  ],
  nightwatch_schedules: [
    { id: scheduleId, user_id: owner, label: "Daily review", symbol: "RNVDAUSDT", playbook_key: "sma_trend_v1", enabled: true, research_run_id: runId, created_at: "2026-11-02T03:00:00.000Z" },
    { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", user_id: other, label: "Other", symbol: "RNVDAUSDT", playbook_key: "sma_trend_v1", enabled: true, research_run_id: runId, created_at: "2026-11-02T03:00:00.000Z" },
  ],
  nightwatch_runs: [
    { id: paperId, user_id: owner, symbol: "RNVDAUSDT", signal: "buy", outcome: "executed", created_at: "2026-11-02T04:00:00.000Z", snapshot: { researchRunId: runId, referencePrice: 100 }, reason: "private", reference_price: 100 },
    { id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", user_id: other, symbol: "RNVDAUSDT", signal: "sell", outcome: "executed", created_at: "2026-11-02T04:00:00.000Z", snapshot: { researchRunId: runId }, reason: "private" },
  ],
};

const forbiddenSelect = /original_snapshot|integrity_hash|parameters|snapshot|candles|train_metrics|test_metrics|summary|reason|reference_price/;

function matches(row, op, column, value) {
  const current = column.includes("->>")
    ? row[column.split("->>")[0]]?.[column.split("->>")[1]]
    : row[column];
  if (current == null) return false;
  if (op === "eq" || op === "ilike") return String(current).toLowerCase() === String(value).toLowerCase();
  return false;
}

function clientFor(source, calls, { fail } = {}) {
  return {
    from(table) {
      const state = { table, filters: [], columns: "" };
      const api = {
        select(columns) { state.columns = columns; return api; },
        eq(column, value) { state.filters.push(["eq", column, value]); return api; },
        filter(column, op, value) { state.filters.push([op, column, value]); return api; },
        order() { return api; },
        limit(count) { state.limit = count; return api; },
        insert() { throw new Error(`decision record must not write ${table}`); },
        update() { throw new Error(`decision record must not write ${table}`); },
        delete() { throw new Error(`decision record must not write ${table}`); },
        maybeSingle: async () => finish(true),
        then(resolve, reject) { return Promise.resolve(finish(false)).then(resolve, reject); },
      };
      function finish(single) {
        calls.push({ source, ...state });
        if (fail?.table === table) return { data: null, error: { message: "unavailable" } };
        let found = (rows[table] ?? []).filter(row => state.filters.every(([op, column, value]) => matches(row, op, column, value)));
        if (state.limit) found = found.slice(0, state.limit);
        return { data: single ? found[0] ?? null : found, error: null };
      }
      return api;
    },
  };
}

function readers(userId, options) {
  const calls = [];
  const store = {
    user: clientFor("user", calls, { fail: options?.fail }),
    capsules: clientFor("capsules", calls, { fail: options?.fail }),
  };
  return { calls, store: { userId, user: store.user, capsules: store.capsules } };
}

test("an owned research run resolves linked ids without copying stored payloads", async () => {
  const { calls, store } = readers(owner);
  const record = await resolveDecisionRecord(store, runId);
  assert.equal(record.id, runId);
  assert.equal(record.anchor, "research_run");
  assert.equal(record.schemaVersion, 1);
  assert.deepEqual(record.researchRun, { id: runId, question: "What changed for NVDA?", status: "complete", createdAt: "2026-11-02T00:00:00.000Z" });
  assert.deepEqual(record.capsule, { id: capsuleId, createdAt: "2026-11-02T01:00:00.000Z" });
  assert.deepEqual(record.strategyBacktests, [{ id: backtestId, strategyKey: "sma_trend_v1", symbol: "RNVDAUSDT", interval: "4H", createdAt: "2026-11-02T02:00:00.000Z" }]);
  assert.deepEqual(record.nightwatchSchedules, [{ id: scheduleId, label: "Daily review", symbol: "RNVDAUSDT", playbookKey: "sma_trend_v1", enabled: true }]);
  assert.deepEqual(record.paperDecisions, [{ id: paperId, symbol: "RNVDAUSDT", signal: "buy", outcome: "executed", createdAt: "2026-11-02T04:00:00.000Z" }]);
  assert.equal("summary" in record.researchRun, false);
  assert.equal(JSON.stringify(record).includes("original_snapshot"), false);
  assert.equal(JSON.stringify(record).includes("referencePrice"), false);
  for (const call of calls) assert.doesNotMatch(call.columns, forbiddenSelect);
  assert.deepEqual(calls.filter(call => call.table === "decision_capsules").map(call => call.source), ["capsules"]);
  assert.ok(calls.filter(call => call.table !== "decision_capsules").every(call => call.source === "user"));
  assert.ok(calls.every(call => call.filters.some(([op, column, value]) => op === "eq" && column === "user_id" && value === owner)));
});

test("another account's run, capsule, backtest, schedule, and paper decision stay hidden", async () => {
  const hiddenRun = await resolveDecisionRecord(readers(owner).store, otherRun);
  const hiddenCapsule = await resolveDecisionRecord(readers(owner).store, otherCapsule);
  assert.equal(hiddenRun, null);
  assert.equal(hiddenCapsule, null);
  const record = await resolveDecisionRecord(readers(owner).store, runId);
  assert.deepEqual(record.strategyBacktests.map(item => item.id), [backtestId]);
  assert.deepEqual(record.nightwatchSchedules.map(item => item.id), [scheduleId]);
  assert.deepEqual(record.paperDecisions.map(item => item.id), [paperId]);
});

test("a capsule whose research run was removed stays a reference to that capsule only", async () => {
  const record = await resolveDecisionRecord(readers(owner).store, orphanCapsule);
  assert.equal(record.id, orphanCapsule);
  assert.equal(record.anchor, "decision_capsule");
  assert.equal(record.researchRun, null);
  assert.deepEqual(record.capsule, { id: orphanCapsule, createdAt: "2026-11-03T01:00:00.000Z" });
  assert.deepEqual(record.strategyBacktests, []);
  assert.deepEqual(record.nightwatchSchedules, []);
  assert.deepEqual(record.paperDecisions, []);
});

test("opening a capsule uses the research run id when that run is still visible", async () => {
  const record = await resolveDecisionRecord(readers(owner).store, capsuleId);
  assert.equal(record.id, runId);
  assert.equal(record.anchor, "research_run");
  assert.equal(record.capsule.id, capsuleId);
});

test("a capsule that points at a run this account cannot read is not returned", async () => {
  rows.decision_capsules.push({ id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", user_id: owner, research_run_id: otherRun, created_at: "2026-11-04T00:00:00.000Z", original_snapshot: { copied: true } });
  try {
    assert.equal(await resolveDecisionRecord(readers(owner).store, "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"), null);
  } finally {
    rows.decision_capsules.pop();
  }
});

test("a read failure does not become an empty decision record", async () => {
  await assert.rejects(
    () => resolveDecisionRecord(readers(owner, { fail: { table: "research_runs" } }).store, runId),
    DecisionRecordUnavailable,
  );
});

test("workspace links are read-only paths to the existing desks", () => {
  assert.equal(decisionRecordHref.capsule(capsuleId), `/api/decision-capsules/${capsuleId}`);
  assert.equal(decisionRecordHref.strategy(runId, "RNVDAUSDT"), `/strategies?symbol=RNVDAUSDT&researchRunId=${runId}`);
  assert.equal(decisionRecordHref.nightwatch(runId, "RNVDAUSDT"), `/nightwatch?symbol=RNVDAUSDT&researchRunId=${runId}`);
  assert.equal(decisionRecordHref.strategy(runId, "bad symbol"), null);
  assert.equal(decisionRecordHref.nightwatch(runId, "NVDA"), null);
  assert.doesNotMatch(decisionRecordHref.nightwatch(runId, "RNVDAUSDT"), /\/api\/nightwatch\/tick/);
});

test("the decision record page only reads and the research result links to it", async () => {
  const [page, workspace, intelligence, flow] = await Promise.all([
    readFile(new URL("../app/decisions/[id]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/ui/research-workspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/ui/intelligence-results.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/ui/agent-flow-desk.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(page, /resolveDecisionRecord\(\{ userId: auth\.user\.id, user, capsules \}, id\)/);
  assert.doesNotMatch(page, /\.insert\(|\.update\(|\.delete\(/);
  assert.match(workspace, /\/decisions\/\$\{brief\.research_run_id\}/);
  assert.match(workspace, /aria-label="Open decision record"/);
  assert.match(intelligence, /\/decisions\/\$\{encodeURIComponent\(result\.researchRunId\)\}/);
  assert.match(intelligence, /aria-label="Open decision record"/);
  assert.match(flow, /\/decisions\/\$\{result\.researchRunId\}/);
  assert.match(flow, /aria-label=\{translate\("Open decision record"\)\}/);
});
