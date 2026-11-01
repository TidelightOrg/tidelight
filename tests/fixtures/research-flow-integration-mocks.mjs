export const after = () => {};
export const NextResponse = class extends Response {
  static json(data, init = {}) { return Response.json(data, init); }
};

export const createClient = async () => globalThis.flowTest;
export const createAdminClient = () => globalThis.flowTest.admin;
export const getServerAuthState = async () => ({ user: globalThis.flowTest.user, errorCode: null });

export const configuredAiProviders = () => ["fixture"];
export const aiJsonWithFallback = async (messages) => {
  globalThis.flowTest.aiCalls++;
  const text = messages.map((message) => message.content).join(" ");
  globalThis.flowTest.lastPrompt = text;
  if (/FOMC/.test(text)) return { assets: [{
    ticker: "MACRO",
    summary: "The Federal Reserve maintained the target range in its September 2026 decision. The supplied official source states the decision; Reuters reports economist expectations as context. The sources do not establish the next policy move.",
    stance: "unclear",
    confidence: 0.3,
    citedUrls: ["https://news.google.com/rss/articles/fomc", "https://news.google.com/rss/articles/reuters"],
    supportingEvidence: [{ text: "The Committee maintained the target range.", citedUrls: ["https://news.google.com/rss/articles/fomc"] }],
    counterEvidence: [{ text: "Economists had expected the same decision.", citedUrls: ["https://news.google.com/rss/articles/reuters"] }],
    risks: ["This is not a forecast of the next policy move."],
    nextCheck: "Read the next official statement and minutes.",
  }] };
  if (globalThis.flowTest.emptyIssuerNews) return { assets: [{
    ticker: "NVDA",
    summary: "SEC-only fixture: reported revenue and net income are available with filing dates; this does not establish future performance.",
    stance: "unclear",
    confidence: 0.3,
    citedUrls: ["https://data.sec.gov/api/xbrl/companyfacts/CIK0000000001.json"],
    supportingEvidence: [{ text: "SEC company facts include filed revenue and net income.", citedUrls: ["https://data.sec.gov/api/xbrl/companyfacts/CIK0000000001.json"] }],
    risks: ["Reported financial facts do not forecast future performance."],
    nextCheck: "Review the complete 10-Q.",
  }] };
  return { assets: [{
    ticker: "NVDA",
    summary: "Synthetic fixture: two current independent publishers agree on a directional scenario for test coverage only.",
    stance: "bullish",
    confidence: 0.9,
    citedUrls: ["https://fixture.example/source-a", "https://fixture.example/source-b"],
    risks: ["Synthetic fixture only"],
    nextCheck: "Remove the fixture after the isolated test.",
  }] };
};

export const STOCK_PERP_UNIVERSE = ["NVDAUSDT"];
export const getIssuerName = () => "Synthetic NVIDIA";
export const getBitgetAsset = (...args) => globalThis.flowTest.asset(...args);
export const getBitgetStockPerp = (...args) => globalThis.flowTest.perp(...args);
export const getBitgetCandles = (...args) => globalThis.flowTest.candles(...args);
export const buildSignals = () => Array.from({ length: 80 }, (_, index) => index === 79);
export const prepareBacktestCandles = () => Array.from({ length: 80 }, (_, index) => ({ timestamp: Date.now() - (80 - index) * 14_400_000 - 60_000, close: 100 }));
export const ALPHA_STRATEGIES = { sma_trend_v1: { label: "Synthetic SMA fixture" } };

export const buildIssuerNewsQueries = () => Array(5).fill("question-focused fixture query");
export const gatherIssuerEvidence = async () => globalThis.flowTest.emptyIssuerNews ? [] : globalThis.flowTest.sourceRows;
export const issuerEvidenceLookbackDays = () => 30;
export const classifyMacroQuestion = (question) => /FOMC/i.test(question) ? "monetary_policy" : null;
export const buildMacroNewsQueries = () => ["site:federalreserve.gov FOMC", "FOMC Reuters"];
export const macroResearchLookbackDays = () => 365;
export const gatherMacroEvidence = async () => { globalThis.flowTest.macroCalls++; return globalThis.flowTest.macroRows; };
export const agentKeyIssuerEvidence = async () => [];
export const getSecCompanyResearch = async (ticker) => ({
  ticker,
  cik: "0000000001",
  sourceUrl: "https://www.sec.gov/edgar/browse/?CIK=1",
  financials: { quarterly: [{
    period: "Q3 2026",
    periodEnd: "2026-09-30",
    filed: "2026-10-25",
    form: "10-Q",
    revenue: 100,
    netIncome: 10,
    totalAssets: 500,
    totalLiabilities: 100,
    operatingCashFlow: 20,
    capitalExpenditure: 5,
    filedByMetric: { revenue: "2026-10-25", netIncome: "2026-10-26", totalAssets: "2026-10-25", totalLiabilities: "2026-10-25", operatingCashFlow: "2026-10-26", capitalExpenditure: "2026-10-26" },
  }], annual: [] },
  dividends: [],
  analystTargets: { status: "not_configured" },
});
export const recordProviderHealth = async () => {};
export const decideFuturesPaper = async (input) => {
  globalThis.flowTest.strategyResearch = input.research;
  return { action: "hold", confidence: 0.8, rationale: "Synthetic Strategy fixture hold; no paper fill.", evidence: ["Synthetic completed candle"], risks: [], invalidation: "Fixture ends" };
};
export const evaluateSmaCrossover = () => ({ fastSma: 101, slowSma: 100, previousFastSma: 99, previousSlowSma: 100 });
export const decideNightwatch = async (input) => {
  globalThis.flowTest.nightwatch = input;
  return { action: "hold", signal: "hold", confidence: 0.9, rationale: "Synthetic Nightwatch fixture held; no order.", evidence: ["Synthetic linked research fixture"], risks: [], invalidation: "Fixture ends", horizon: "test only" };
};
export const normalizeNightwatchPreferences = (value) => ({ playbook_key: value.playbook_key ?? "sma_trend_v1" });
export const enqueueNightwatchEmail = async () => {};
export const drainEmailQueue = async () => {};
export const normalizeFuturesProposal = () => null;
