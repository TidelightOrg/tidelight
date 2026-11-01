import "server-only";

export type SecFact = { val: number; end: string; filed: string; form: string; fy?: number; fp?: string; start?: string };
type CompanyFacts = { cik: number; entityName: string; facts: { [taxonomy: string]: Record<string, { label?: string; units?: Record<string, SecFact[]> }> } };
type Submissions = { name: string; sic?: string; sicDescription?: string; exchanges?: string[]; addresses?: { business?: Record<string, string> }; formerNames?: Array<{ name: string; from: string; to: string }> };
type TickerIndex = Record<string, { cik_str: number; ticker: string; title: string }>;
type SecFinancialPeriod = { period: string; periodEnd: string; filed: string; form: string; revenue: number | null; netIncome: number | null; totalAssets: number | null; totalLiabilities: number | null; operatingCashFlow: number | null; capitalExpenditure: number | null; filedByMetric: Record<"revenue" | "netIncome" | "totalAssets" | "totalLiabilities" | "operatingCashFlow" | "capitalExpenditure", string | null> };

const SEC = "https://data.sec.gov";
const SEC_WEB = "https://www.sec.gov";
const identity = process.env.SEC_USER_AGENT || "Tidelight contact research@tidelight.app";
const requestHeaders = { "User-Agent": identity, Accept: "application/json" };

export class SecIssuerNotFoundError extends Error {
  constructor(ticker: string) {
    super(`No SEC registrant was found for ${ticker}.`);
    this.name = "SecIssuerNotFoundError";
  }
}

async function secJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: requestHeaders, next: { revalidate: 21600 }, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`SEC returned HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

export type CompanyResearch = {
  ticker: string;
  cik: string;
  asOf: string;
  limitations: string[];
  companyName: string;
  industry: string | null;
  exchange: string | null;
  headquarters: string | null;
  website: string | null;
  employeeCount: number | null;
  source: "SEC EDGAR";
  sourceUrl: string;
  retrievedAt: string;
  financials: {
    quarterly: SecFinancialPeriod[];
    annual: SecFinancialPeriod[];
  };
  dividends: { periodEnd: string; filed: string; amountPerShare: number; unit: string }[];
  analystTargets: { status: "available"; high: number | null; low: number | null; mean: number | null; median: number | null; updatedAt: string; source: "Finnhub" } | { status: "not_configured" } | { status: "unavailable" };
};

async function analystTargets(ticker: string): Promise<CompanyResearch["analystTargets"]> {
  const token = process.env.FINNHUB_API_KEY;
  if (!token) return { status: "not_configured" };
  try {
    const response = await fetch(`https://finnhub.io/api/v1/stock/price-target?symbol=${encodeURIComponent(ticker)}&token=${encodeURIComponent(token)}`, { headers: { Accept: "application/json" }, next: { revalidate: 21600 }, signal: AbortSignal.timeout(4500) });
    if (!response.ok) {
      console.warn("finnhub-price-target-http-unavailable", { ticker, status: response.status });
      return { status: "unavailable" };
    }
    const data = await response.json() as { targetHigh?: number; targetLow?: number; targetMean?: number; targetMedian?: number; lastUpdated?: string };
    const values = [data.targetHigh, data.targetLow, data.targetMean, data.targetMedian];
    if (!values.some((value) => typeof value === "number" && Number.isFinite(value) && value > 0)) {
      console.warn("finnhub-price-target-empty", { ticker, fields: Object.keys(data) });
      return { status: "unavailable" };
    }
    return { status: "available", high: data.targetHigh ?? null, low: data.targetLow ?? null, mean: data.targetMean ?? null, median: data.targetMedian ?? null, updatedAt: data.lastUpdated ?? new Date().toISOString(), source: "Finnhub" };
  } catch (error) {
    console.warn("finnhub-price-target-request-failed", { ticker, reason: error instanceof Error ? error.name : "unknown" });
    return { status: "unavailable" };
  }
}

function latestFact(facts: CompanyFacts, tags: string[], unit = "USD", eligible: (item: SecFact) => boolean = () => true): SecFact[] {
  const gaap = facts.facts["us-gaap"] ?? {};
  for (const tag of tags) {
    const values = gaap[tag]?.units?.[unit]?.filter(eligible);
    if (values?.length) return values;
  }
  return [];
}

// SEC Company Facts exposes an acceptance date here, not a timestamp. Treat
// the as-of calendar day as unavailable because intraday ordering is unknown.
function filedBeforeAsOfDay(filed: string, asOfDate: string) { return filed < asOfDate; }

function periodValues(facts: CompanyFacts, tags: string[], form: "10-Q" | "10-K", duration: "quarter" | "annual", asOfDate = "9999-12-31"): Map<string, SecFact> {
  const lengthDays = (item: SecFact) => (Date.parse(`${item.end}T00:00:00Z`) - Date.parse(`${item.start}T00:00:00Z`)) / 86400000;
  const eligible = (item: SecFact) => Boolean(item.form === form && item.start && item.end && item.filed) && filedBeforeAsOfDay(item.filed, asOfDate) && item.end <= asOfDate && (duration === "quarter" ? lengthDays(item) >= 60 && lengthDays(item) <= 115 : lengthDays(item) >= 300 && lengthDays(item) <= 400);
  const byEnd = new Map<string, SecFact>();
  for (const tag of tags) {
    const latestByEnd = new Map<string, SecFact>();
    for (const item of latestFact(facts, [tag], "USD", eligible).sort((a, b) => a.filed.localeCompare(b.filed))) latestByEnd.set(item.end, item);
    for (const [end, item] of latestByEnd) if (!byEnd.has(end)) byEnd.set(end, item);
  }
  return byEnd;
}

function instantValue(facts: CompanyFacts, tags: string[], end: string, form: "10-Q" | "10-K", asOfDate = "9999-12-31"): SecFact | undefined {
  return latestFact(facts, tags, "USD", item => item.end === end && item.form === form && !item.start && Boolean(item.filed) && filedBeforeAsOfDay(item.filed, asOfDate) && item.end <= asOfDate).sort((a, b) => b.filed.localeCompare(a.filed))[0];
}

function quarterLabel(end: string) {
  const date = new Date(`${end}T00:00:00Z`);
  return `Q${Math.ceil((date.getUTCMonth() + 1) / 3)} ${date.getUTCFullYear()}`;
}

function buildPeriods(facts: CompanyFacts, duration: "quarter" | "annual", asOfDate = "9999-12-31") {
  const form = duration === "quarter" ? "10-Q" : "10-K";
  const revenues = periodValues(facts, ["RevenueFromContractWithCustomerExcludingAssessedTax", "Revenues", "SalesRevenueNet"], form, duration, asOfDate);
  const income = periodValues(facts, ["NetIncomeLoss"], form, duration, asOfDate);
  const cash = periodValues(facts, ["NetCashProvidedByUsedInOperatingActivities"], form, duration, asOfDate);
  const capex = periodValues(facts, ["PaymentsToAcquirePropertyPlantAndEquipment"], form, duration, asOfDate);
  const ends = [...new Set([...revenues.keys(), ...income.keys(), ...cash.keys(), ...capex.keys()])].filter(end => [revenues, income, cash, capex].some(series => (series.get(end)?.filed ?? "9999-12-31") <= asOfDate)).sort().reverse().slice(0, duration === "quarter" ? 16 : 10);
  return ends.map((end) => {
    const revenue = revenues.get(end), netIncome = income.get(end), operatingCashFlow = cash.get(end), capitalExpenditure = capex.get(end);
    const basis = revenue ?? netIncome ?? operatingCashFlow ?? capitalExpenditure;
    const formForInstant: "10-Q" | "10-K" = basis?.form === "10-K" ? "10-K" : basis?.form === "10-Q" ? "10-Q" : form;
    const totalAssets = instantValue(facts, ["Assets"], end, formForInstant, asOfDate);
    const totalLiabilities = instantValue(facts, ["Liabilities"], end, formForInstant, asOfDate);
    return {
      period: duration === "quarter" ? quarterLabel(end) : `FY ${new Date(`${end}T00:00:00Z`).getUTCFullYear()}`,
      periodEnd: end,
      filed: basis?.filed ?? "",
      form: formForInstant,
      revenue: revenue?.val ?? null,
      netIncome: netIncome?.val ?? null,
      totalAssets: totalAssets?.val ?? null,
      totalLiabilities: totalLiabilities?.val ?? null,
      operatingCashFlow: operatingCashFlow?.val ?? null,
      capitalExpenditure: capitalExpenditure?.val ?? null,
      filedByMetric: { revenue: revenue?.filed ?? null, netIncome: netIncome?.filed ?? null, totalAssets: totalAssets?.filed ?? null, totalLiabilities: totalLiabilities?.filed ?? null, operatingCashFlow: operatingCashFlow?.filed ?? null, capitalExpenditure: capitalExpenditure?.filed ?? null },
    };
  });
}

export async function getSecCompanyResearch(ticker: string, website: string | null, options: { asOf?: string; includeAnalystTargets?: boolean } = {}): Promise<CompanyResearch> {
  const asOfMs = options.asOf === undefined ? Date.now() : Date.parse(options.asOf);
  if (!Number.isFinite(asOfMs)) throw new Error("sec-company-research-invalid-asof");
  const asOfDate = new Date(asOfMs).toISOString().slice(0, 10);
  const normalized = ticker.toUpperCase();
  const index = await secJson<TickerIndex>(`${SEC_WEB}/files/company_tickers.json`);
  const match = Object.values(index).find((item) => item.ticker.toUpperCase() === normalized);
  if (!match) throw new SecIssuerNotFoundError(normalized);
  const cik = String(match.cik_str).padStart(10, "0");
  const [submissions, companyfacts] = await Promise.all([
    secJson<Submissions>(`${SEC}/submissions/CIK${cik}.json`),
    secJson<CompanyFacts>(`${SEC}/api/xbrl/companyfacts/CIK${cik}.json`),
  ]);
  const retrievedAt = new Date().toISOString();
  const address = submissions.addresses?.business;
  const headquarters = address ? [address.street1, address.street2, [address.city, address.stateOrCountry, address.zipCode].filter(Boolean).join(" ")].filter(Boolean).join(", ") : null;
  const facts = companyfacts.facts["dei"]?.EntityNumberOfEmployees?.units?.pure ?? [];
  const employeeCount = facts.filter(item => filedBeforeAsOfDay(item.filed, asOfDate) && item.end <= asOfDate).sort((a, b) => b.end.localeCompare(a.end))[0]?.val ?? null;
  const dividends = latestFact(companyfacts, ["CommonStockDividendsPerShareCashPaid", "CommonStockDividendsPerShareDeclared"], "USD / shares", item => ["10-Q", "10-K"].includes(item.form) && Boolean(item.end && item.filed) && filedBeforeAsOfDay(item.filed, asOfDate) && item.end <= asOfDate)
    .sort((a, b) => b.end.localeCompare(a.end)).slice(0, 12)
    .map((item) => ({ periodEnd: item.end, filed: item.filed, amountPerShare: item.val, unit: "USD per share as reported" }));
  const quarterly = buildPeriods(companyfacts, "quarter", asOfDate);
  const annual = buildPeriods(companyfacts, "annual", asOfDate);
  const targetData = options.includeAnalystTargets === false ? { status: "not_configured" as const } : await analystTargets(normalized);
  return {
    ticker: normalized, cik, asOf: new Date(asOfMs).toISOString(),
    limitations: ["SEC facts filed on the as-of date are excluded because filing times are unavailable."],
    companyName: submissions.name || companyfacts.entityName,
    industry: submissions.sicDescription ?? null, exchange: submissions.exchanges?.[0] ?? null,
    headquarters, website, employeeCount, source: "SEC EDGAR",
    sourceUrl: `https://www.sec.gov/edgar/browse/?CIK=${Number(cik)}`,
    retrievedAt,
    financials: { quarterly, annual },
    dividends,
    analystTargets: targetData,
  };
}
