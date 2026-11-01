import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const researchId = "d475bd46-5035-4ae5-9f19-e2959a4f0734";
const user = { id: "synthetic-test-user" };
const sourceRows = [
  { title: "Synthetic issuer update one", url: "https://fixture.example/source-a", publisher: "Fixture Journal A", publishedAt: new Date().toISOString(), snippet: "Synthetic test fixture only." },
  { title: "Synthetic issuer update two", url: "https://fixture.example/source-b", publisher: "Fixture Journal B", publishedAt: new Date().toISOString(), snippet: "Synthetic test fixture only." },
];
const macroRows = [
  { title: "Federal Reserve issues September 2026 FOMC statement", url: "https://news.google.com/rss/articles/fomc", publisher: "Federal Reserve", publishedAt: new Date().toISOString(), snippet: "The Committee decided to maintain the target range.", sourceKind: "official" },
  { title: "Fed holds rates in September, Reuters reports", url: "https://news.google.com/rss/articles/reuters", publisher: "Reuters", publishedAt: new Date().toISOString(), snippet: "Economists expected a decision to maintain rates.", sourceKind: "independent_reporting" },
];
const captures = { rpc: [], research: [], nightwatch: null, orders: [], marketCalls: 0, macroCalls: 0, aiCalls: 0 };
const candle = (index) => ({ timestamp: Date.now() - (100 - index) * 4 * 60 * 60 * 1000, close: 100 + index / 100, open: 100, high: 101, low: 99, volume: 1000 });
const candles = Array.from({ length: 100 }, (_, index) => candle(index));

function queryFor(table) {
  const query = {
    columns: "",
    select(columns) { this.columns = columns ?? ""; return this; },
    insert(rows) { captures.research.push({ table, operation: "insert", rows }); return this; },
    upsert(rows) { captures.research.push({ table, operation: "upsert", rows }); return this; },
    update(values) { captures.research.push({ table, operation: "update", values }); return this; },
    eq() { return this; }, gte() { return this; }, limit() { return this; },
    single() { return Promise.resolve({ data: { id: researchId }, error: null }); },
    maybeSingle() { return Promise.resolve({ data: table === "research_runs" ? { id: researchId, question: "Synthetic NVDA evidence fixture", summary: { assets: [{ ticker: "NVDA", summary: "Synthetic fixture assessment." }] }, status: "complete" } : table === "nightwatch_preferences" ? { playbook_key: "sma_trend_v1", alert_on_signal: false, alert_on_fill: false } : null, error: null }); },
    then(resolve, reject) {
      const result = table === "research_runs" && this.columns === "id" ? { count: 0, error: null } : { data: [], error: null };
      return Promise.resolve(result).then(resolve, reject);
    },
  };
  return query;
}

globalThis.flowTest = {
  macroCalls: 0,
  aiCalls: 0,
  emptyIssuerNews: false,
  user,
  auth: { getUser: async () => ({ data: { user }, error: null }) },
  from: queryFor,
  rpc: async (...args) => globalThis.flowTest.admin.rpc(...args),
  asset: async (symbol) => { captures.marketCalls++; return ({ symbol, isReality: true, underlyingTicker: "NVDA", name: "Synthetic NVIDIA fixture", lastPrice: 100, providerTimestamp: Date.now() }); },
  perp: async (symbol) => { captures.marketCalls++; return ({ symbol, name: "Synthetic NVDA perpetual fixture", lastPrice: 100, providerTimestamp: Date.now() }); },
  candles: async () => { captures.marketCalls++; return candles; },
  admin: {
    from: queryFor,
    rpc: async (name, args) => {
      captures.rpc.push({ name, args });
      if (name === "reserve_guest_research") return { data: globalThis.flowTest.guestAllowed !== false, error: null };
      if (name === "futures_paper_apply") {
        captures.orders.push(args.p_action);
        return { data: { id: "synthetic-paper-decision", action: args.p_action, outcome: "no_action" }, error: null };
      }
      return { data: { run_id: "synthetic-nightwatch-run", outcome: "no_action", reason: "Hold fixture" }, error: null };
    },
  },
};

const modules = {
  "next/server": "export const after=()=>{}; export const NextResponse=class extends Response { static json(data,init={}) { return Response.json(data,init); } };",
  "@/lib/supabase/server": "export const createClient=async()=>globalThis.flowTest;",
  "@/lib/supabase/admin": "export const createAdminClient=()=>globalThis.flowTest.admin;",
  "@/lib/supabase/auth-user": "export const getServerAuthState=async()=>({user:globalThis.flowTest.user,errorCode:null});",
  "@/lib/ai-fallback": `export const configuredAiProviders=()=>["fixture"]; export const aiJsonWithFallback=async(messages)=>{globalThis.flowTest.aiCalls++;const text=messages.map(message=>message.content).join(" ");return /FOMC/.test(text)?{assets:[{ticker:"MACRO",summary:"The Federal Reserve maintained the target range in its September 2026 decision. The supplied official source states the decision; Reuters reports economist expectations as context. The sources do not establish the next policy move.",stance:"unclear",confidence:0.3,citedUrls:["${macroRows[0].url}","${macroRows[1].url}"],supportingEvidence:[{text:"The Committee maintained the target range.",citedUrls:["${macroRows[0].url}"]}],counterEvidence:[{text:"Economists had expected the same decision.",citedUrls:["${macroRows[1].url}"]}],risks:["This is not a forecast of the next policy move."],nextCheck:"Read the next official statement and minutes."}]}:globalThis.flowTest.emptyIssuerNews?{assets:[{ticker:"NVDA",summary:"SEC-only fixture: reported revenue and net income are available with filing dates; this does not establish future performance.",stance:"unclear",confidence:0.3,citedUrls:["https://www.sec.gov/edgar/browse/?CIK=1"],supportingEvidence:[{text:"SEC company facts include filed revenue and net income.",citedUrls:["https://www.sec.gov/edgar/browse/?CIK=1"]}],risks:["Reported financial facts do not forecast future performance."],nextCheck:"Review the complete 10-Q."}]}:{assets:[{ticker:"NVDA",summary:"Synthetic fixture: two current independent publishers agree on a directional scenario for test coverage only.",stance:"bullish",confidence:0.9,citedUrls:["${sourceRows[0].url}","${sourceRows[1].url}"],risks:["Synthetic fixture only"],nextCheck:"Remove the fixture after the isolated test."}]};};`,
  "@/lib/bitget-market": "export const STOCK_PERP_UNIVERSE=[\"NVDAUSDT\"]; export const getIssuerName=()=>\"Synthetic NVIDIA\"; export const getBitgetAsset=(...args)=>globalThis.flowTest.asset(...args); export const getBitgetStockPerp=(...args)=>globalThis.flowTest.perp(...args); export const getBitgetCandles=(...args)=>globalThis.flowTest.candles(...args);",
  "@/lib/sec-fundamentals": "export const getSecCompanyResearch=async(ticker,_website,options)=>({ticker,sourceUrl:'https://www.sec.gov/edgar/browse/?CIK=1',financials:{quarterly:[{period:'Q3 2026',periodEnd:'2026-09-30',filed:'2026-10-25',form:'10-Q',revenue:100,netIncome:10,totalAssets:500,totalLiabilities:100,operatingCashFlow:20,capitalExpenditure:5,filedByMetric:{revenue:'2026-10-25',netIncome:'2026-10-26',totalAssets:'2026-10-25',totalLiabilities:'2026-10-25',operatingCashFlow:'2026-10-26',capitalExpenditure:'2026-10-26'}}],annual:[]},dividends:[],analystTargets:{status:'not_configured'}});",
  "@/lib/backtest": "export const prepareBacktestCandles=()=>Array.from({length:80},(_,i)=>({timestamp:Date.now()-(80-i)*14400000-60000,close:100})); export const buildSignals=()=>Array.from({length:80},(_,i)=>i===79); export const ALPHA_STRATEGIES={sma_trend_v1:{label:\"Synthetic SMA fixture\"}};",
  "@/lib/agent-flow-sources": `export const buildIssuerNewsQueries=()=>Array(5).fill("question-focused fixture query"); export const gatherIssuerEvidence=async()=>globalThis.flowTest.emptyIssuerNews?[]:${JSON.stringify(sourceRows)}; export const issuerEvidenceLookbackDays=()=>30;`,
  "@/lib/macro-research-sources": `export const classifyMacroQuestion=question=>/FOMC/i.test(question)?"monetary_policy":null; export const buildMacroNewsQueries=()=>["site:federalreserve.gov FOMC","FOMC Reuters"]; export const macroResearchLookbackDays=()=>365; export const gatherMacroEvidence=async()=>{globalThis.flowTest.macroCalls++; return ${JSON.stringify(macroRows)};};`,
  "@/lib/agentkey-flow-sources": "export const agentKeyIssuerEvidence=async()=>[];",
  "@/lib/futures-paper-agent": "export const decideFuturesPaper=async input=>{globalThis.flowTest.strategyResearch=input.research;return{action:\"hold\",confidence:0.8,rationale:\"Synthetic Strategy fixture hold; no paper fill.\",evidence:[\"Synthetic completed candle\"],risks:[],invalidation:\"Fixture ends\"};};",
  "@/lib/futures-paper-policy": "export const normalizeFuturesProposal=()=>null;",
  "@/lib/nightwatch-signal": "export const evaluateSmaCrossover=()=>({fastSma:101,slowSma:100,previousFastSma:99,previousSlowSma:100});",
  "@/lib/nightwatch-agent": "export const decideNightwatch=async input=>{globalThis.flowTest.nightwatch=input;return{action:\"hold\",signal:\"hold\",confidence:0.9,rationale:\"Synthetic Nightwatch fixture held; no order.\",evidence:[\"Synthetic linked research fixture\"],risks:[],invalidation:\"Fixture ends\",horizon:\"test only\"};};",
  "@/lib/nightwatch-preferences": "export const normalizeNightwatchPreferences=value=>({playbook_key:value.playbook_key??\"sma_trend_v1\"});",
  "@/lib/email/nightwatch": "export const enqueueNightwatchEmail=async()=>{};",
  "@/lib/email/delivery": "export const drainEmailQueue=async()=>{};",
};

const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { url: "data:text/javascript,export {};", shortCircuit: true };
  if (modules[specifier]) return { url: `data:text/javascript,${encodeURIComponent(modules[specifier])}`, shortCircuit: true };
  if (specifier.startsWith("@/lib/")) return { url: new URL(`../lib/${specifier.slice(6)}.ts`, import.meta.url).href, shortCircuit: true };
  return nextResolve(specifier, context);
} });
const researchRoute = await import("../app/api/research/agent-flow/route.ts");
const strategyRoute = await import("../app/api/futures/paper/route.ts");
const nightwatchRoute = await import("../app/api/nightwatch/tick/route.ts");
hooks.deregister();

test("synthetic positive handoff preserves lineage through Research → paper Strategy → Nightwatch without live execution", async () => {
  const researchResponse = await researchRoute.POST(new Request("https://tidelight.app/api/research/agent-flow", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: "Review NVDA using synthetic test fixture sources" }),
  }));
  assert.equal(researchResponse.status, 200);
  const researchEvents = (await researchResponse.text()).split("\n\n").filter(Boolean).map(frame => JSON.parse(frame.split("\ndata: ")[1]));
  const research = researchEvents.findLast(frame => frame.researchRunId);
  assert.ok(research, "research route emitted a saved result");
  assert.equal(research.researchRunId, researchId);
  assert.equal(research.tradeable, true);
  assert.ok(research.evidenceGraph.nodes.some(node => node.type === "subject" && node.ticker === "NVDA"));
  assert.ok(research.evidenceGraph.nodes.some(node => node.type === "source" && node.url === sourceRows[0].url));
  const secRevenue = research.evidenceGraph.nodes.find(node => node.type === "financial_fact" && node.label.includes("Revenue"));
  const secIncome = research.evidenceGraph.nodes.find(node => node.type === "financial_fact" && node.label.includes("Net income"));
  assert.equal(secRevenue.filedAt, "2026-10-25");
  assert.equal(secIncome.filedAt, "2026-10-26", "each metric keeps its own SEC filing date");
  assert.ok(research.assets[0].sources.some(source => source.publisher === "SEC EDGAR"), "SEC citations are included in displayed asset sources");
  assert.ok(captures.research.find(row => row.table === "research_sources")?.rows.some(source => source.publisher === "SEC EDGAR"), "SEC citations are persisted alongside the run");
  assert.equal(research.assets[0].handoff.destinations[0].mode, "paper_futures");
  assert.match(research.assets[0].handoff.destinations[0].href, new RegExp(`researchRunId=${researchId}`));

  const strategyResponse = await strategyRoute.POST(new Request("https://tidelight.app/api/futures/paper", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ symbol: "NVDAUSDT", researchRunId: research.researchRunId, mode: "check" }),
  }));
  assert.equal(strategyResponse.status, 200);
  assert.deepEqual(globalThis.flowTest.strategyResearch, { question: "Synthetic NVDA evidence fixture", summary: { assets: [{ ticker: "NVDA", summary: "Synthetic fixture assessment." }] } });
  const strategyCommit = captures.rpc.find(call => call.name === "futures_paper_apply");
  assert.equal(strategyCommit.args.p_snapshot.researchRunId, researchId);
  assert.equal(strategyCommit.args.p_snapshot.paperOnly, true);
  assert.equal(strategyCommit.args.p_snapshot.marketCategory, "USDT-FUTURES");
  assert.deepEqual(captures.orders, ["hold"]);

  const nightwatchResponse = await nightwatchRoute.POST(new Request("https://tidelight.app/api/nightwatch/tick", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ symbol: "RNVDAUSDT", researchRunId: researchId }),
  }));
  assert.equal(nightwatchResponse.status, 200);
  assert.equal(globalThis.flowTest.nightwatch.research.question, "Synthetic NVDA evidence fixture");
  const nightwatchCommit = captures.rpc.find(call => call.name === "nightwatch_tick");
  assert.equal(nightwatchCommit.args.p_snapshot.researchRunId, researchId);
  assert.equal(nightwatchCommit.args.p_signal, "hold");
  assert.deepEqual(captures.orders, ["hold"], "the fixture did not create a paper fill or any live order");
});

test("macro-only research saves a source-bound brief and bypasses stock providers and trade handoff", async () => {
  captures.marketCalls = 0;
  captures.macroCalls = 0;
  globalThis.flowTest.macroCalls = 0;
  const response = await researchRoute.POST(new Request("https://tidelight.app/api/research/agent-flow", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: "Explain the September 16, 2026 FOMC decision and the evidence relevant to its stated rationale." }),
  }));
  assert.equal(response.status, 200);
  const events = (await response.text()).split("\n\n").filter(Boolean).map(frame => JSON.parse(frame.split("\ndata: ")[1]));
  const result = events.findLast(frame => frame.researchRunId);
  assert.ok(result, "macro route emitted a saved result");
  assert.equal(result.researchType, "macro");
  assert.equal(result.macroTopic, "monetary_policy");
  assert.equal(result.assets.length, 1);
  assert.equal(result.assets[0].ticker, "MACRO");
  assert.equal(result.tradeable, false);
  assert.equal(result.assets[0].tradeable, false);
  assert.equal(result.assets[0].handoff, null);
  assert.equal(result.assets[0].market.perpSymbol, null);
  assert.equal(result.assets[0].market.lastPrice, null);
  assert.ok(result.evidenceGraph.nodes.some(node => node.type === "subject" && node.subjectType === "macro_topic"));
  assert.ok(result.evidenceGraph.nodes.some(node => node.type === "passage" && node.exactQuoteVerified === false));
  assert.deepEqual(result.assets[0].sources.map(source => source.via), ["Official source", "Independent reporting"]);
  assert.ok(result.assets[0].gateReasons.some(reason => reason.includes("information-only")));
  assert.equal(globalThis.flowTest.macroCalls, 1);
  assert.equal(captures.marketCalls, 0, "macro-only run never called Bitget or candle providers");
  assert.ok(!result.trace.some(stage => stage.agent === "Alpha Factory" || stage.agent === "Trading agent"));
  assert.ok(captures.research.some(call => call.table === "research_sources" && call.operation === "upsert"));
  assert.ok(captures.research.some(call => call.table === "research_runs" && call.operation === "update" && call.values?.status === "complete" && call.values?.summary?.researchType === "macro"));
});

test("anonymous judge research is same-origin, session-only, and cannot hand off to trading", async () => {
  process.env.CRON_SECRET = "synthetic-test-only-rate-limit-key";
  const previousUser = globalThis.flowTest.user;
  globalThis.flowTest.user = null;
  globalThis.flowTest.guestAllowed = true;
  captures.research.length = 0;
  const rpcCallsBeforeInvalidQuestion = captures.rpc.length;
  const nonJudgeGuest = await researchRoute.POST(new Request("https://tidelight.app/api/research/agent-flow", {
    method: "POST", headers: { origin: "https://tidelight.app", "content-type": "application/json" }, body: JSON.stringify({ question: "Review NVDA with current public evidence" }),
  }));
  assert.equal(nonJudgeGuest.status, 401);
  assert.match((await nonJudgeGuest.json()).error, /sign in/i);
  assert.equal(captures.rpc.length, rpcCallsBeforeInvalidQuestion, "ordinary guest requests do not consume Judge Mode capacity");
  let streamingChunksRead = 0;
  let oversizedStreamCancelled = false;
  const streamingRequest = new Request("https://tidelight.app/api/research/agent-flow", {
    method: "POST", headers: { origin: "https://tidelight.app", "content-type": "application/json" }, duplex: "half",
    body: new ReadableStream({
      pull(controller) { streamingChunksRead++; controller.enqueue(new Uint8Array(1_024)); },
      cancel() { oversizedStreamCancelled = true; },
    }),
  });
  assert.equal(streamingRequest.headers.has("content-length"), false, "streamed request has no declared length");
  const oversizedStreamResponse = await researchRoute.POST(streamingRequest);
  assert.equal(oversizedStreamResponse.status, 413);
  assert.ok(oversizedStreamCancelled, "oversized streamed bodies are cancelled as soon as the byte cap is crossed");
  assert.ok(streamingChunksRead <= 7, "the route does not drain an unbounded chunked body");
  assert.equal(captures.rpc.length, rpcCallsBeforeInvalidQuestion, "oversized streamed requests do not consume anonymous capacity");
  const oversizedUtf8Body = await researchRoute.POST(new Request("https://tidelight.app/api/research/agent-flow", {
    method: "POST", headers: { origin: "https://tidelight.app", "content-type": "application/json" }, body: JSON.stringify({ question: "Review NVDA with current public evidence", judgeMode: true, extra: "€".repeat(2_100) }),
  }));
  assert.equal(oversizedUtf8Body.status, 413, "UTF-8 request bytes are bounded even when decoded character count is below the limit");
  assert.equal(captures.rpc.length, rpcCallsBeforeInvalidQuestion, "oversized requests do not consume anonymous capacity");
  const invalidScope = await researchRoute.POST(new Request("https://tidelight.app/api/research/agent-flow", {
    method: "POST", headers: { origin: "https://tidelight.app", "content-type": "application/json" }, body: JSON.stringify({ question: "What could happen to an affected rToken?", judgeMode: true }),
  }));
  assert.equal(invalidScope.status, 422);
  assert.equal(captures.rpc.length, rpcCallsBeforeInvalidQuestion, "unsupported guest questions do not consume rate-limit capacity");
  const response = await researchRoute.POST(new Request("https://tidelight.app/api/research/agent-flow", {
    method: "POST", headers: { origin: "https://tidelight.app", "content-type": "application/json" }, body: JSON.stringify({ question: "Review NVDA with current public evidence", judgeMode: true }),
  }));
  assert.equal(response.status, 200);
  const events = (await response.text()).split("\n\n").filter(Boolean).map(frame => JSON.parse(frame.split("\ndata: ")[1]));
  const result = events.findLast(frame => frame.guestSessionResult === true);
  assert.ok(result, `guest research emits an in-session result without an account record identifier; events=${JSON.stringify(events.slice(-3))}`);
  assert.equal("researchRunId" in result, false);
  assert.equal(result.tradeable, false);
  assert.equal(result.assets[0].tradeable, false);
  assert.equal(result.assets[0].handoff, null);
  assert.equal(captures.research.length, 0, "guest prompts and research sources are not written to private account tables");
  assert.ok(captures.rpc.some(call => call.name === "reserve_guest_research"));

  const blockedOrigin = await researchRoute.POST(new Request("https://tidelight.app/api/research/agent-flow", {
    method: "POST", headers: { origin: "https://attacker.example", "content-type": "application/json" }, body: JSON.stringify({ question: "Review NVDA with current public evidence", judgeMode: true }),
  }));
  assert.equal(blockedOrigin.status, 403);

  const blockedLimit = await researchRoute.POST(new Request("https://tidelight.app/api/research/agent-flow", {
    method: "POST", headers: { origin: "https://tidelight.app", "content-type": "application/json" }, body: JSON.stringify({ question: "Review NVDA with current public evidence", judgeMode: true, contextRunId: researchId }),
  }));
  assert.equal(blockedLimit.status, 403, "guest calls cannot read saved account research context");
  globalThis.flowTest.guestAllowed = false;
  const rateLimited = await researchRoute.POST(new Request("https://tidelight.app/api/research/agent-flow", {
    method: "POST", headers: { origin: "https://tidelight.app", "content-type": "application/json" }, body: JSON.stringify({ question: "Review NVDA with current public evidence", judgeMode: true }),
  }));
  assert.equal(rateLimited.status, 429, "database rate-limit denial prevents provider work");
  globalThis.flowTest.user = previousUser;
  globalThis.flowTest.guestAllowed = true;
test("SEC-only evidence is eligible for grounded synthesis when issuer news retrieval is empty", async () => {
  globalThis.flowTest.emptyIssuerNews = true;
  globalThis.flowTest.aiCalls = 0;
  const response = await researchRoute.POST(new Request("https://tidelight.app/api/research/agent-flow", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: "Summarize NVDA's reported revenue and net income using its filed financials" }),
  }));
  assert.equal(response.status, 200);
  const events = (await response.text()).split("\n\n").filter(Boolean).map(frame => JSON.parse(frame.split("\ndata: ")[1]));
  const result = events.findLast(frame => frame.researchRunId);
  assert.ok(result, "research route emitted a saved result");
  assert.equal(globalThis.flowTest.aiCalls, 1, "the configured analyst received SEC facts despite empty news coverage");
  assert.match(result.assets[0].summary, /SEC-only fixture/);
  assert.ok(result.assets[0].sources.some(source => source.publisher === "SEC EDGAR"));
  assert.ok(result.evidenceGraph.nodes.some(node => node.type === "source" && node.publisher === "SEC EDGAR"));
  assert.ok(result.evidenceGraph.nodes.some(node => node.type === "claim" && node.citationStatus === "source_linked"));
  assert.equal(result.assets[0].tradeable, false, "SEC fundamentals alone do not unlock a trading handoff");
  globalThis.flowTest.emptyIssuerNews = false;
});
