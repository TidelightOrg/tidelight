import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const runId = "10000000-0000-4000-8000-000000000001";
const sourceId = "20000000-0000-4000-8000-000000000001";
const evidenceId = "30000000-0000-4000-8000-000000000001";

function setup(userId) {
  const reads = [];
  const run = { id: runId, question: "Review NVDA filing", created_at: "2026-10-31T19:00:00.000Z", completed_at: "2026-10-31T20:00:00.000Z", status: "complete", summary: { exposure: [], answer_status: "source_matched_claims", sources: [{ url: "https://sec.gov/future", publication_date: "2026-11-01" }, { url: "https://sec.gov/same-day", publication_date: "2026-10-31" }] } };
  const source = { id: sourceId, url: "https://sec.gov/filing/1", title: "SEC filing", publisher: "SEC", published_at: null, retrieved_at: "2026-10-31T19:10:00.000Z", source_type: "filing", excerpt: "Revenue grew 8 percent.", content_hash: "a".repeat(64) };
  const evidence = { id: evidenceId, source_id: sourceId, claim: "Revenue grew 8 percent.", supporting_quote: "Revenue grew 8 percent.", stance: "supports", confidence: 0.8, created_at: "2026-10-31T19:12:00.000Z", quote_match_status: "matched_to_captured_text", claim_support_status: "not_independently_verified", passage_start_codepoint: 0, passage_end_codepoint: 21 };
  const futureSource = { ...source, id: "20000000-0000-4000-8000-000000000002", url: "https://sec.gov/future", retrieved_at: "2026-11-01T00:00:00.000Z" };
  const sameDaySource = { ...source, id: "20000000-0000-4000-8000-000000000003", url: "https://sec.gov/same-day" };
  const futureClaim = { ...evidence, id: "30000000-0000-4000-8000-000000000002", source_id: futureSource.id, claim: "Future publication claim" };
  const sameDayClaim = { ...evidence, id: "30000000-0000-4000-8000-000000000003", source_id: sameDaySource.id, claim: "Snapshot day publication claim" };
  const rows = { research_runs: run, research_sources: [source, futureSource, sameDaySource], research_evidence: [evidence, futureClaim, sameDayClaim] };
  const db = {
    from(table) {
      const filters = [];
      const builder = {
        select(columns, options) { this.columns = columns; this.options = options; return this; },
        eq(key, value) { filters.push([key, value]); return this; },
        order() { return this; },
        limit(value) { this.rowLimit = value; return this; },
        maybeSingle() {
          reads.push({ table, filters: [...filters] });
          const owned = filters.some(([key, value]) => key === "id" && value === runId) && filters.some(([key, value]) => key === "user_id" && value === userId);
          return Promise.resolve({ data: owned && userId === "owner" ? run : null, error: null });
        },
        then(resolve, reject) {
          reads.push({ table, filters: [...filters], limit: this.rowLimit });
          const runFilter = filters.some(([key, value]) => key === "research_run_id" && value === runId);
          const data = runFilter ? rows[table].slice(0, this.rowLimit) : [];
          return Promise.resolve({ data, count: runFilter ? rows[table].length : 0, error: null }).then(resolve, reject);
        },
      };
      return builder;
    },
  };
  globalThis.savedEvidenceGraphTest = { auth: { user: userId ? { id: userId } : null, errorCode: null, errorName: null, errorStatus: null }, db, reads, rows };
  return globalThis.savedEvidenceGraphTest;
}

const mocks = {
  "next/server": "export const NextResponse=class extends Response { static json(data,init={}) { return Response.json(data,init); } };",
  "@/lib/supabase/admin": "export const createAdminClient=()=>globalThis.savedEvidenceGraphTest.db;",
  "@/lib/supabase/auth-user": "export const getServerAuthState=async()=>globalThis.savedEvidenceGraphTest.auth;",
};

test("verifier outages return 503 while invalid credentials return 401", async () => {
  const state = setup(null);
  state.auth.errorName = "AuthRetryableFetchError";
  state.auth.errorStatus = null;
  const hooks = registerHooks({ resolve(specifier, _context, nextResolve) { if (specifier === "@/lib/saved-evidence-graph") return { url: new URL("../lib/saved-evidence-graph.ts", import.meta.url).href, shortCircuit: true }; if (specifier === "@/lib/evidence") return { url: new URL("../lib/evidence.ts", import.meta.url).href, shortCircuit: true }; if (mocks[specifier]) return { url: `data:text/javascript,${encodeURIComponent(mocks[specifier])}`, shortCircuit: true }; return nextResolve(specifier); } });
  try {
    const route = await import("../app/api/research/evidence-graph/[runId]/route.ts?test=saved-graph-auth-outage");
    const outage = await route.GET(new Request(`https://tidelight.app/api/research/evidence-graph/${runId}`), { params: Promise.resolve({ runId }) });
    assert.equal(outage.status, 503);
    state.auth.errorName = "AuthApiError";
    state.auth.errorCode = null;
    state.auth.errorStatus = 503;
    const serviceFailure = await route.GET(new Request(`https://tidelight.app/api/research/evidence-graph/${runId}`), { params: Promise.resolve({ runId }) });
    assert.equal(serviceFailure.status, 503);
    state.auth.errorName = "AuthApiError";
    state.auth.errorCode = "bad_jwt";
    state.auth.errorStatus = 401;
    const invalid = await route.GET(new Request(`https://tidelight.app/api/research/evidence-graph/${runId}`), { params: Promise.resolve({ runId }) });
    assert.equal(invalid.status, 401);
    assert.equal(state.reads.length, 0);
  } finally { hooks.deregister(); delete globalThis.savedEvidenceGraphTest; }
});

test("private graph requires a user and never queries before auth", async () => {
  const state = setup(null);
  const hooks = registerHooks({ resolve(specifier, _context, nextResolve) { if (specifier === "@/lib/saved-evidence-graph") return { url: new URL("../lib/saved-evidence-graph.ts", import.meta.url).href, shortCircuit: true }; if (specifier === "@/lib/evidence") return { url: new URL("../lib/evidence.ts", import.meta.url).href, shortCircuit: true }; if (mocks[specifier]) return { url: `data:text/javascript,${encodeURIComponent(mocks[specifier])}`, shortCircuit: true }; return nextResolve(specifier); } });
  try {
    const route = await import("../app/api/research/evidence-graph/[runId]/route.ts?test=saved-graph-auth");
    const response = await route.GET(new Request(`https://tidelight.app/api/research/evidence-graph/${runId}`), { params: Promise.resolve({ runId }) });
    assert.equal(response.status, 401);
    assert.equal(state.reads.length, 0);
  } finally { hooks.deregister(); delete globalThis.savedEvidenceGraphTest; }
});

test("private graph scopes the run to the verified owner and returns linked persisted records", async () => {
  const state = setup("owner");
  const hooks = registerHooks({ resolve(specifier, _context, nextResolve) { if (specifier === "@/lib/saved-evidence-graph") return { url: new URL("../lib/saved-evidence-graph.ts", import.meta.url).href, shortCircuit: true }; if (specifier === "@/lib/evidence") return { url: new URL("../lib/evidence.ts", import.meta.url).href, shortCircuit: true }; if (mocks[specifier]) return { url: `data:text/javascript,${encodeURIComponent(mocks[specifier])}`, shortCircuit: true }; return nextResolve(specifier); } });
  try {
    const route = await import("../app/api/research/evidence-graph/[runId]/route.ts?test=saved-graph-owner");
    const response = await route.GET(new Request(`https://tidelight.app/api/research/evidence-graph/${runId}`), { params: Promise.resolve({ runId }) });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    const graph = await response.json();
    assert.equal(graph.scope, "saved_research_run");
    assert.equal(graph.nodes.some(node => node.id === `source:${sourceId}`), true);
    assert.equal(graph.nodes.some(node => node.id === `claim:${evidenceId}`), true);
    assert.equal(graph.nodes.some(node => node.id === "source:20000000-0000-4000-8000-000000000002"), false);
    assert.equal(graph.nodes.some(node => node.id === "claim:30000000-0000-4000-8000-000000000002"), false);
    assert.equal(graph.nodes.some(node => node.id === "source:20000000-0000-4000-8000-000000000003"), false);
    assert.equal(graph.nodes.some(node => node.id === "claim:30000000-0000-4000-8000-000000000003"), false);
    assert.ok(graph.edges.some(edge => edge.from === `claim:${evidenceId}` && edge.to === `source:${sourceId}` && edge.relation === "cites"));
    assert.ok(state.reads.some(read => read.table === "research_runs" && read.filters.some(([key, value]) => key === "user_id" && value === "owner")));
  } finally { hooks.deregister(); delete globalThis.savedEvidenceGraphTest; }
});

test("another owner's run is not discoverable", async () => {
  const state = setup("other-owner");
  const hooks = registerHooks({ resolve(specifier, _context, nextResolve) { if (specifier === "@/lib/saved-evidence-graph") return { url: new URL("../lib/saved-evidence-graph.ts", import.meta.url).href, shortCircuit: true }; if (specifier === "@/lib/evidence") return { url: new URL("../lib/evidence.ts", import.meta.url).href, shortCircuit: true }; if (mocks[specifier]) return { url: `data:text/javascript,${encodeURIComponent(mocks[specifier])}`, shortCircuit: true }; return nextResolve(specifier); } });
  try {
    const route = await import("../app/api/research/evidence-graph/[runId]/route.ts?test=saved-graph-other-owner");
    const response = await route.GET(new Request(`https://tidelight.app/api/research/evidence-graph/${runId}`), { params: Promise.resolve({ runId }) });
    assert.equal(response.status, 404);
    assert.equal(state.reads.filter(read => read.table !== "research_runs").length, 0);
  } finally { hooks.deregister(); delete globalThis.savedEvidenceGraphTest; }
});

test("non-brief research records are not represented by the saved-brief graph API", async () => {
  const state = setup("owner");
  state.db.from = ((original) => (table) => {
    const builder = original(table);
    builder.maybeSingle = function() {
      return Promise.resolve({ data: { ...globalThis.savedEvidenceGraphTestRun, summary: { schemaVersion: 1, assets: [] } }, error: null });
    };
    return builder;
  })(state.db.from.bind(state.db));
  globalThis.savedEvidenceGraphTestRun = { id: runId, question: "Review NVDA filing", created_at: "2026-10-31T19:00:00.000Z", completed_at: "2026-10-31T20:00:00.000Z", status: "complete", summary: {} };
  const hooks = registerHooks({ resolve(specifier, _context, nextResolve) { if (specifier === "@/lib/saved-evidence-graph") return { url: new URL("../lib/saved-evidence-graph.ts", import.meta.url).href, shortCircuit: true }; if (specifier === "@/lib/evidence") return { url: new URL("../lib/evidence.ts", import.meta.url).href, shortCircuit: true }; if (mocks[specifier]) return { url: `data:text/javascript,${encodeURIComponent(mocks[specifier])}`, shortCircuit: true }; return nextResolve(specifier); } });
  try {
    const route = await import("../app/api/research/evidence-graph/[runId]/route.ts?test=saved-graph-ineligible");
    const response = await route.GET(new Request(`https://tidelight.app/api/research/evidence-graph/${runId}`), { params: Promise.resolve({ runId }) });
    assert.equal(response.status, 404);
    assert.equal(state.reads.filter(read => read.table !== "research_runs").length, 0);
  } finally { hooks.deregister(); delete globalThis.savedEvidenceGraphTest; delete globalThis.savedEvidenceGraphTestRun; }
});


test("oversized source and evidence graphs return 413 without partial nodes", async () => {
  for (const [table, amount] of [["research_sources", 91], ["research_evidence", 501]]) {
    const state = setup("owner");
    const template = state.rows[table][0];
    state.rows[table] = Array.from({ length: amount }, (_, index) => ({ ...template, id: `${String(index + 1).padStart(8, "0")}-0000-4000-8000-000000000001` }));
    const hooks = registerHooks({ resolve(specifier, _context, nextResolve) { if (specifier === "@/lib/saved-evidence-graph") return { url: new URL("../lib/saved-evidence-graph.ts", import.meta.url).href, shortCircuit: true }; if (specifier === "@/lib/evidence") return { url: new URL("../lib/evidence.ts", import.meta.url).href, shortCircuit: true }; if (mocks[specifier]) return { url: `data:text/javascript,${encodeURIComponent(mocks[specifier])}`, shortCircuit: true }; return nextResolve(specifier); } });
    try {
      const route = await import(`../app/api/research/evidence-graph/[runId]/route.ts?test=saved-graph-limit-${table}`);
      const response = await route.GET(new Request(`https://tidelight.app/api/research/evidence-graph/${runId}`), { params: Promise.resolve({ runId }) });
      assert.equal(response.status, 413);
      assert.equal(response.headers.get("cache-control"), "private, no-store");
      assert.equal(Object.hasOwn(await response.json(), "nodes"), false);
    } finally { hooks.deregister(); delete globalThis.savedEvidenceGraphTest; }
  }
});

test("oversized source and evidence text returns 413 without partial nodes", async () => {
  const cases = [
    ["source-url", state => { state.rows.research_sources[0].url = `https://example.com/${"x".repeat(4_097)}`; }],
    ["source-title", state => { state.rows.research_sources[0].title = "x".repeat(301); }],
    ["source-publisher", state => { state.rows.research_sources[0].publisher = "x".repeat(121); }],
    ["source-content-hash", state => { state.rows.research_sources[0].content_hash = "x".repeat(3_000_000); }],
    ["source-excerpt", state => { state.rows.research_sources[0].excerpt = "x".repeat(6_001); }],
    ["evidence-claim", state => { state.rows.research_evidence[0].claim = "x".repeat(2_001); }],
    ["evidence-quote", state => { state.rows.research_evidence[0].supporting_quote = "x".repeat(601); }],
  ];
  for (const [label, mutate] of cases) {
    const state = setup("owner");
    mutate(state);
    const hooks = registerHooks({ resolve(specifier, _context, nextResolve) { if (specifier === "@/lib/saved-evidence-graph") return { url: new URL("../lib/saved-evidence-graph.ts", import.meta.url).href, shortCircuit: true }; if (specifier === "@/lib/evidence") return { url: new URL("../lib/evidence.ts", import.meta.url).href, shortCircuit: true }; if (mocks[specifier]) return { url: `data:text/javascript,${encodeURIComponent(mocks[specifier])}`, shortCircuit: true }; return nextResolve(specifier); } });
    try {
      const route = await import(`../app/api/research/evidence-graph/[runId]/route.ts?test=saved-graph-text-limit-${label}`);
      const response = await route.GET(new Request(`https://tidelight.app/api/research/evidence-graph/${runId}`), { params: Promise.resolve({ runId }) });
      assert.equal(response.status, 413);
      assert.equal(response.headers.get("cache-control"), "private, no-store");
      assert.equal(Object.hasOwn(await response.json(), "nodes"), false);
    } finally { hooks.deregister(); delete globalThis.savedEvidenceGraphTest; }
  }
});

test("repeated complete passages cannot exceed the response text budget", async () => {
  const state = setup("owner");
  const excerpt = `Revenue${" ".repeat(5_960)}grew 8 percent.`;
  state.rows.research_sources[0].excerpt = excerpt;
  state.rows.research_evidence = Array.from({ length: 400 }, (_, index) => ({
    ...state.rows.research_evidence[0],
    id: `30000000-0000-4000-8000-${String(index + 10).padStart(12, "0")}`,
    claim: "Revenue grew eight percent for the period.",
    supporting_quote: "Revenue grew 8 percent.",
    passage_start_codepoint: 0,
    passage_end_codepoint: Array.from(excerpt).length,
  }));
  const hooks = registerHooks({ resolve(specifier, _context, nextResolve) { if (specifier === "@/lib/saved-evidence-graph") return { url: new URL("../lib/saved-evidence-graph.ts", import.meta.url).href, shortCircuit: true }; if (specifier === "@/lib/evidence") return { url: new URL("../lib/evidence.ts", import.meta.url).href, shortCircuit: true }; if (mocks[specifier]) return { url: `data:text/javascript,${encodeURIComponent(mocks[specifier])}`, shortCircuit: true }; return nextResolve(specifier); } });
  try {
    const route = await import(`../app/api/research/evidence-graph/[runId]/route.ts?test=saved-graph-output-text-limit`);
    const response = await route.GET(new Request(`https://tidelight.app/api/research/evidence-graph/${runId}`), { params: Promise.resolve({ runId }) });
    assert.equal(response.status, 413);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(Object.hasOwn(await response.json(), "nodes"), false);
  } finally { hooks.deregister(); delete globalThis.savedEvidenceGraphTest; }
});

test("invalid completion timestamps return 422 without partial nodes", async () => {
  const state = setup("owner");
  state.rows.research_runs.completed_at = null;
  const hooks = registerHooks({ resolve(specifier, _context, nextResolve) { if (specifier === "@/lib/saved-evidence-graph") return { url: new URL("../lib/saved-evidence-graph.ts", import.meta.url).href, shortCircuit: true }; if (specifier === "@/lib/evidence") return { url: new URL("../lib/evidence.ts", import.meta.url).href, shortCircuit: true }; if (mocks[specifier]) return { url: `data:text/javascript,${encodeURIComponent(mocks[specifier])}`, shortCircuit: true }; return nextResolve(specifier); } });
  try {
    const route = await import("../app/api/research/evidence-graph/[runId]/route.ts?test=saved-graph-invalid-asof-route");
    const response = await route.GET(new Request(`https://tidelight.app/api/research/evidence-graph/${runId}`), { params: Promise.resolve({ runId }) });
    assert.equal(response.status, 422);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(Object.hasOwn(await response.json(), "nodes"), false);
  } finally { hooks.deregister(); delete globalThis.savedEvidenceGraphTest; }
});
