import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  DecisionRecordUnavailable,
  decisionRecordCompositeCursor,
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
const sourceId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const evidenceId = "ffffffff-ffff-4fff-8fff-ffffffffffff";

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
    { id: backtestId, user_id: owner, strategy_key: "sma_trend_v1", symbol: "NVDAUSDT", interval: "4H", created_at: "2026-11-02T02:00:00.000Z", parameters: { researchRunId: runId.toUpperCase(), marketCategory: "SPOT", candles: [1], feeBpsPerSide: 10 }, train_metrics: { returnPct: 1 }, candles: [1] },
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
  research_sources: [
    { id: sourceId, research_run_id: runId, title: "NVIDIA earnings release", publisher: "NVIDIA", source_type: "filing", url: "https://investor.example/release?token=secret#section", published_at: "2026-11-01T12:00:00.000Z", retrieved_at: "2026-11-02T00:02:00.000Z", excerpt: "private excerpt", content_hash: "x".repeat(64) },
    { id: "12121212-aaaa-4121-8121-121212121212", research_run_id: otherRun, title: "Other account", publisher: "Other", source_type: "web", url: "https://example.org", published_at: null, retrieved_at: "2026-11-02T00:02:00.000Z", excerpt: "private" },
  ],
  research_evidence: [
    { id: evidenceId, research_run_id: runId, source_id: sourceId, claim: "Revenue guidance increased year over year.", supporting_quote: "private quote", stance: "supports", confidence: "0.875", created_at: "2026-11-02T00:03:00.000Z" },
    { id: "12121212-bbbb-4121-8121-121212121212", research_run_id: otherRun, source_id: null, claim: "Other account claim", supporting_quote: "private", stance: "context", confidence: 0.5, created_at: "2026-11-02T00:03:00.000Z" },
  ],
};

const forbiddenSelect = /original_snapshot|integrity_hash|(?:^|,)parameters(?:,|$)|(?:^|,)snapshot(?:,|$)|candles|train_metrics|test_metrics|summary|reason|reference_price|excerpt|supporting_quote|content_hash/;

function matches(row, op, column, value) {
  if (op === "or") {
    const cursor = value.match(/^([a-z_]+)\.lt\.(.+),and\(\1\.eq\.(.+),id\.lt\.([0-9a-f-]+)\)$/i);
    if (!cursor) return false;
    const current = String(row[cursor[1]] ?? "");
    return current < cursor[2] || (current === cursor[3] && String(row.id) < cursor[4]);
  }
  const current = column.includes("->>")
    ? row[column.split("->>")[0]]?.[column.split("->>")[1]]
    : row[column];
  if (op === "lt") return current != null && String(current) < String(value);
  if (current == null) return false;
  if (op === "eq" || op === "ilike") return String(current).toLowerCase() === String(value).toLowerCase();
  return false;
}

function clientFor(source, calls, { fail } = {}) {
  return {
    from(table) {
      const state = { table, filters: [], columns: "", orders: [] };
      const api = {
        select(columns) { state.columns = columns; return api; },
        eq(column, value) { state.filters.push(["eq", column, value]); return api; },
        lt(column, value) { state.filters.push(["lt", column, value]); return api; },
        filter(column, op, value) { state.filters.push([op, column, value]); return api; },
        or(value) { state.filters.push(["or", "", value]); return api; },
        order(column, options) { state.orders.push([column, options?.ascending !== false]); return api; },
        limit(count) { state.limit = count; return api; },
        insert() { throw new Error(`decision record must not write ${table}`); },
        update() { throw new Error(`decision record must not write ${table}`); },
        delete() { throw new Error(`decision record must not write ${table}`); },
        maybeSingle: async () => finish(true),
        then(resolve, reject) { return Promise.resolve(finish(false)).then(resolve, reject); },
      };
      function project(row) {
        if (!state.columns) return { ...row };
        const out = {};
        const projection = state.columns.replace("source:research_sources!research_evidence_source_run_fkey(id,title,publisher,url)", "source:research_sources!research_evidence_source_run_fkey");
        for (const part of projection.split(",")) {
          const piece = part.trim();
          const alias = piece.match(/^([A-Za-z_][A-Za-z0-9_]*):([A-Za-z_][A-Za-z0-9_]*)->>(([A-Za-z_][A-Za-z0-9_]*))$/);
          if (alias) out[alias[1]] = row[alias[2]]?.[alias[3]] ?? null;
          else if (piece === "source:research_sources!research_evidence_source_run_fkey") {
            const source = rows.research_sources?.find(item => item.id === row.source_id && item.research_run_id === row.research_run_id);
            out.source = source ? { id: source.id, title: source.title, publisher: source.publisher, url: source.url } : null;
          }
          else out[piece] = row[piece];
        }
        return out;
      }
      function finish(single) {
        calls.push({ source, ...state });
        if (fail?.table === table) return { data: null, error: { code: fail.code, message: fail.message ?? "unavailable" } };
        let found = (rows[table] ?? []).filter(row => state.filters.every(([op, column, value]) => matches(row, op, column, value)));
        if (state.orders.length) found.sort((left, right) => {
          for (const [column, ascending] of state.orders) {
            const a = left[column]; const b = right[column];
            if (a === b) continue;
            return (String(a) < String(b) ? -1 : 1) * (ascending ? 1 : -1);
          }
          return 0;
        });
        if (state.limit) found = found.slice(0, state.limit);
        const projected = found.map(project);
        return { data: single ? projected[0] ?? null : projected, error: null };
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
  assert.deepEqual(record.strategyBacktests, { items: [{ id: backtestId, strategyKey: "sma_trend_v1", symbol: "NVDAUSDT", interval: "4H", marketCategory: "SPOT", createdAt: "2026-11-02T02:00:00.000Z" }], earlier: null });
  assert.ok(calls.some(call => call.table === "strategy_backtest_runs" && call.columns.includes("market_category:parameters->>marketCategory")));
  assert.deepEqual(record.nightwatchSchedules, { items: [{ id: scheduleId, label: "Daily review", symbol: "RNVDAUSDT", playbookKey: "sma_trend_v1", enabled: true }], earlier: null });
  assert.deepEqual(record.paperDecisions, { items: [{ id: paperId, symbol: "RNVDAUSDT", signal: "buy", outcome: "executed", createdAt: "2026-11-02T04:00:00.000Z" }], earlier: null });
  assert.deepEqual(record.sources, { items: [{ id: sourceId, title: "NVIDIA earnings release", publisher: "NVIDIA", sourceType: "filing", href: "https://investor.example/release", publishedAt: "2026-11-01T12:00:00.000Z", retrievedAt: "2026-11-02T00:02:00.000Z" }], earlier: null });
  assert.deepEqual(record.evidence, { items: [{ id: evidenceId, sourceId, source: { id: sourceId, title: "NVIDIA earnings release", publisher: "NVIDIA", href: "https://investor.example/release" }, claim: "Revenue guidance increased year over year.", stance: "supports", confidence: 0.875, createdAt: "2026-11-02T00:03:00.000Z" }], earlier: null });
  assert.equal("summary" in record.researchRun, false);
  assert.equal(JSON.stringify(record).includes("original_snapshot"), false);
  assert.equal(JSON.stringify(record).includes("referencePrice"), false);
  assert.equal(JSON.stringify(record).includes("private quote"), false);
  assert.equal(JSON.stringify(record).includes("?token=secret"), false);
  for (const call of calls) assert.doesNotMatch(call.columns, forbiddenSelect);
  assert.deepEqual(calls.filter(call => call.table === "decision_capsules").map(call => call.source), ["capsules"]);
  assert.ok(calls.filter(call => call.table !== "decision_capsules").every(call => call.source === "user"));
  for (const call of calls) {
    if (call.table === "research_sources" || call.table === "research_evidence") {
      assert.ok(call.filters.some(([op, column, value]) => op === "eq" && column === "research_run_id" && value === runId));
    } else {
      assert.ok(call.filters.some(([op, column, value]) => op === "eq" && column === "user_id" && value === owner));
    }
  }
});

test("another account's run, capsule, backtest, schedule, and paper decision stay hidden", async () => {
  const hiddenRun = await resolveDecisionRecord(readers(owner).store, otherRun);
  const hiddenCapsule = await resolveDecisionRecord(readers(owner).store, otherCapsule);
  assert.equal(hiddenRun, null);
  assert.equal(hiddenCapsule, null);
  const record = await resolveDecisionRecord(readers(owner).store, runId);
  assert.deepEqual(record.strategyBacktests.items.map(item => item.id), [backtestId]);
  assert.deepEqual(record.nightwatchSchedules.items.map(item => item.id), [scheduleId]);
  assert.deepEqual(record.paperDecisions.items.map(item => item.id), [paperId]);
  assert.deepEqual(record.sources.items.map(item => item.id), [sourceId]);
  assert.deepEqual(record.evidence.items.map(item => item.id), [evidenceId]);
});

test("decision records accept source titles up to the existing 300-character storage limit", async () => {
  const previous = rows.research_sources[0].title;
  rows.research_sources[0].title = "T".repeat(300);
  try {
    const record = await resolveDecisionRecord(readers(owner).store, runId);
    assert.equal(record.sources.items[0].title.length, 300);
    assert.equal(record.evidence.items[0].source.title.length, 300);
  } finally { rows.research_sources[0].title = previous; }
});

test("a capsule whose research run was removed stays a reference to that capsule only", async () => {
  const record = await resolveDecisionRecord(readers(owner).store, orphanCapsule);
  assert.equal(record.id, orphanCapsule);
  assert.equal(record.anchor, "decision_capsule");
  assert.equal(record.researchRun, null);
  assert.deepEqual(record.capsule, { id: orphanCapsule, createdAt: "2026-11-03T01:00:00.000Z" });
  assert.deepEqual(record.strategyBacktests, { items: [], earlier: null });
  assert.deepEqual(record.nightwatchSchedules, { items: [], earlier: null });
  assert.deepEqual(record.paperDecisions, { items: [], earlier: null });
  assert.deepEqual(record.sources, { items: [], earlier: null });
  assert.deepEqual(record.evidence, { items: [], earlier: null });
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
  const errors = [];
  const original = console.error;
  console.error = (...args) => { errors.push(args); };
  try {
    await assert.rejects(
      () => resolveDecisionRecord(readers(owner, { fail: { table: "research_runs", message: "permission denied for table research_runs", code: "42501" } }).store, runId),
      DecisionRecordUnavailable,
    );
  } finally {
    console.error = original;
  }
  assert.deepEqual(errors, [["Decision record read failed", { code: "42501", message: "permission denied for table research_runs" }]]);
});

test("workspace links are read-only paths to the existing desks", () => {
  assert.equal(decisionRecordHref.capsule(capsuleId), `/api/decision-capsules/${capsuleId}`);
  assert.equal(decisionRecordHref.strategy(runId, "RNVDAUSDT", "SPOT"), `/strategies?symbol=RNVDAUSDT&researchRunId=${runId}&market=SPOT`);
  assert.equal(decisionRecordHref.strategy(runId, "NVDAUSDT", "USDT-FUTURES"), `/strategies?symbol=NVDAUSDT&researchRunId=${runId}&market=USDT-FUTURES`);
  assert.equal(decisionRecordHref.nightwatch(runId, "RNVDAUSDT"), `/nightwatch?symbol=RNVDAUSDT&researchRunId=${runId}`);
  assert.equal(decisionRecordHref.strategy(runId, "bad symbol", "SPOT"), null);
  assert.equal(decisionRecordHref.nightwatch(runId, "NVDA"), null);
  assert.doesNotMatch(decisionRecordHref.nightwatch(runId, "RNVDAUSDT"), /\/api\/nightwatch\/tick/);
});

test("a futures backtest keeps its market, and older links stay reachable", async () => {
  const saved = rows.strategy_backtest_runs;
  rows.strategy_backtest_runs = Array.from({ length: 51 }, (_, index) => ({
    id: `12121212-1212-4121-8121-${String(index).padStart(12, "0")}`,
    user_id: owner,
    strategy_key: "sma_trend_v1",
    symbol: "NVDAUSDT",
    interval: "1H",
    created_at: new Date(Date.UTC(2026, 10, 2, 12, 0, 0) - index * 1000).toISOString(),
    parameters: { researchRunId: runId, marketCategory: "USDT-FUTURES", candles: [1] },
  }));
  try {
    const first = await resolveDecisionRecord(readers(owner).store, runId);
    assert.equal(first.strategyBacktests.items.length, 50);
    assert.equal(first.strategyBacktests.items[0].marketCategory, "USDT-FUTURES");
    assert.equal(first.strategyBacktests.earlier, `${rows.strategy_backtest_runs[49].created_at}~${rows.strategy_backtest_runs[49].id}`);
    assert.equal(decisionRecordHref.strategy(runId, "NVDAUSDT", first.strategyBacktests.items[0].marketCategory), `/strategies?symbol=NVDAUSDT&researchRunId=${runId}&market=USDT-FUTURES`);
    const second = await resolveDecisionRecord(readers(owner).store, runId, { strategiesBefore: first.strategyBacktests.earlier });
    assert.deepEqual(second.strategyBacktests.items.map(item => item.id), [rows.strategy_backtest_runs[50].id]);
    assert.equal(second.strategyBacktests.earlier, null);
  } finally {
    rows.strategy_backtest_runs = saved;
  }
});

test("source captures and evidence claims use independent older-page cursors", async () => {
  const savedSources = rows.research_sources;
  const savedEvidence = rows.research_evidence;
  rows.research_sources = Array.from({ length: 51 }, (_, index) => ({
    id: `34343434-3434-4343-8343-${String(index).padStart(12, "0")}`,
    research_run_id: runId,
    title: `Source ${index}`,
    publisher: "Publisher",
    source_type: "web",
    url: "https://example.org/article",
    published_at: null,
    retrieved_at: new Date(Date.UTC(2026, 10, 2, 12, 0, 0) - index * 1000).toISOString(),
  }));
  rows.research_evidence = Array.from({ length: 51 }, (_, index) => ({
    id: `45454545-4545-4454-8454-${String(index).padStart(12, "0")}`,
    research_run_id: runId,
    source_id: null,
    claim: `Claim ${index}`,
    stance: "context",
    confidence: null,
    created_at: new Date(Date.UTC(2026, 10, 2, 13, 0, 0) - index * 1000).toISOString(),
  }));
  try {
    const first = await resolveDecisionRecord(readers(owner).store, runId);
    assert.equal(first.sources.items.length, 50);
    assert.equal(first.evidence.items.length, 50);
    const sourceCursor = first.sources.earlier;
    const evidenceCursor = first.evidence.earlier;
    assert.equal(sourceCursor, `${rows.research_sources[49].retrieved_at}~${rows.research_sources[49].id}`);
    assert.equal(decisionRecordCompositeCursor(sourceCursor), sourceCursor);
    assert.equal(decisionRecordCompositeCursor("invalid"), null);
    assert.equal(decisionRecordCompositeCursor([sourceCursor, sourceCursor]), null);
    assert.equal(evidenceCursor, `${rows.research_evidence[49].created_at}~${rows.research_evidence[49].id}`);
    const second = await resolveDecisionRecord(readers(owner).store, runId, { sourcesBefore: sourceCursor, evidenceBefore: evidenceCursor });
    assert.deepEqual(second.sources.items.map(item => item.id), [rows.research_sources[50].id]);
    assert.deepEqual(second.evidence.items.map(item => item.id), [rows.research_evidence[50].id]);
  } finally {
    rows.research_sources = savedSources;
    rows.research_evidence = savedEvidence;
  }
});

test("source citations stay reachable and resolvable when source rows share a batch timestamp", async () => {
  const saved = rows.research_sources;
  const savedEvidence = rows.research_evidence;
  const retrievedAt = "2026-11-02T14:00:00.000Z";
  rows.research_sources = Array.from({ length: 51 }, (_, index) => ({
    id: `56565656-5656-4565-8565-${String(index).padStart(12, "0")}`,
    research_run_id: runId,
    title: `Batch source ${index}`,
    publisher: "Batch publisher",
    source_type: "web",
    url: "https://example.org/batch",
    published_at: null,
    retrieved_at: retrievedAt,
  }));
  rows.research_evidence = [{ id: "67676767-6767-4676-8676-767676767676", research_run_id: runId, source_id: rows.research_sources[0].id, claim: "This claim references a source on the next source page.", stance: "context", confidence: null, created_at: "2026-11-02T14:01:00.000Z" }];
  try {
    const first = await resolveDecisionRecord(readers(owner).store, runId);
    assert.equal(first.sources.items.length, 50);
    assert.ok(!first.sources.items.some(item => item.id === rows.research_sources[0].id));
    assert.equal(first.evidence.items[0].source.title, "Batch source 0");
    assert.equal(first.evidence.items[0].source.id, rows.research_sources[0].id);
    assert.equal(first.sources.earlier, `${retrievedAt}~56565656-5656-4565-8565-000000000001`);
    const second = await resolveDecisionRecord(readers(owner).store, runId, { sourcesBefore: first.sources.earlier });
    assert.deepEqual(second.sources.items.map(item => item.id), [rows.research_sources[0].id]);
    assert.equal(second.sources.earlier, null);
  } finally { rows.research_sources = saved; rows.research_evidence = savedEvidence; }
});

test("same-batch evidence claims stay reachable with a stable id tie-breaker", async () => {
  const saved = rows.research_evidence;
  const createdAt = "2026-11-02T15:00:00.000Z";
  rows.research_evidence = Array.from({ length: 51 }, (_, index) => ({
    id: `78787878-7878-4787-8787-${String(index).padStart(12, "0")}`,
    research_run_id: runId,
    source_id: null,
    claim: `Batch claim ${index}`,
    stance: "context",
    confidence: null,
    created_at: createdAt,
  }));
  try {
    const first = await resolveDecisionRecord(readers(owner).store, runId);
    assert.equal(first.evidence.items.length, 50);
    const cursor = first.evidence.earlier;
    assert.equal(cursor, `${createdAt}~78787878-7878-4787-8787-000000000001`);
    const second = await resolveDecisionRecord(readers(owner).store, runId, { evidenceBefore: cursor });
    assert.deepEqual(second.evidence.items.map(item => item.id), [rows.research_evidence[0].id]);
    assert.equal(second.evidence.earlier, null);
  } finally { rows.research_evidence = saved; }
});

test("decision records display all saved evidence claims up to the existing 2,000-character limit", async () => {
  const previous = rows.research_evidence[0].claim;
  rows.research_evidence[0].claim = "C".repeat(2000);
  try {
    const record = await resolveDecisionRecord(readers(owner).store, runId);
    assert.equal(record.evidence.items[0].claim.length, 2000);
  } finally { rows.research_evidence[0].claim = previous; }
});

test("the decision record page only reads and the research result links to it", async () => {
  const [page, workspace, intelligence, flow, strategies, lab] = await Promise.all([
    readFile(new URL("../app/decisions/[id]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/ui/research-workspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/ui/intelligence-results.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/ui/agent-flow-desk.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/strategies/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/ui/strategy-lab.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(strategies, /initialMarketCategory=\{initialMarketCategory\}/);
  assert.match(lab, /useState<AlphaMarketCategory>\(initialMarketCategory\)/);
  assert.match(page, /Earlier strategy backtests|decisionRecordEarlierHref|strategiesBefore/);
  assert.match(page, /sourcesBefore/);
  assert.match(page, /decisionRecordCompositeCursor/);
  assert.match(page, /evidenceBefore/);
  assert.match(page, /resolveDecisionRecord\(\{ userId: auth\.user\.id, user: records, capsules: records \}, id, cursors\)/);
  assert.match(page, /records = createAdminClient\(\)/);
  assert.doesNotMatch(page, /createClient\(/);
  assert.doesNotMatch(page, /\.insert\(|\.update\(|\.delete\(/);
  const shell = await readFile(new URL("../app/ui/workspace-shell.tsx", import.meta.url), "utf8");
  assert.match(shell, /pathname === "\/decisions" \|\| pathname\.startsWith\("\/decisions\/"\)/);
  assert.match(shell, /Decision record/);
  assert.match(workspace, /\/decisions\/\$\{brief\.research_run_id\}/);
  assert.match(workspace, /aria-label="Open decision record"/);
  assert.match(intelligence, /\/decisions\/\$\{encodeURIComponent\(result\.researchRunId\)\}/);
  assert.match(intelligence, /aria-label="Open decision record"/);
  assert.match(flow, /\/decisions\/\$\{result\.researchRunId\}/);
  assert.match(flow, /aria-label=\{translate\("Open decision record"\)\}/);
  const decisionView = await readFile(new URL("../app/ui/decision-record-view.tsx", import.meta.url), "utf8");
  assert.match(decisionView, /Research sources/);
  assert.match(decisionView, /Evidence claims/);
  assert.match(decisionView, /rel: "noreferrer noopener"/);
  assert.match(decisionView, /item\.source\.title/);
});
