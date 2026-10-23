export type FlowSource = { title: string; url: string; publisher: string; publishedAt: string | null; via?: "Public feeds" | "AgentKey" };
export type FlowStance = "bullish" | "bearish" | "mixed" | "unclear";
export type FlowEvidencePoint = { text: string; citedUrls: string[] };
export type FlowAssessment = { summary: string; stance: FlowStance; confidence: number; confidenceCapped?: boolean; citedUrls: string[]; supportingEvidence: FlowEvidencePoint[]; counterEvidence: FlowEvidencePoint[]; risks: string[]; nextCheck: string };
export type FlowGateInput = {
  assessment: FlowAssessment;
  sources: FlowSource[];
  marketVerified: boolean;
  marketTimestamp: number | null;
  lastCompletedCandleEnd: number | null;
  completedCandles: number;
  currentSignal: boolean;
  previousSignal: boolean;
  now: number;
};

/** Detect explicit token-market intent without treating ordinary words such as “right” as rTickers. */
export function isTokenizedMarketQuestion(question: string, tickers: readonly string[]): boolean {
  if (/\b(?:tokeni[sz]ed|reality market|r[\s-]?token)\b/i.test(question)) return true;
  return tickers.some((ticker) => /^[A-Z]{1,6}$/i.test(ticker) && new RegExp(`\\br[\\s-]?${ticker}(?:usdt)?\\b`, "i").test(question));
}

/** Evidence-only fallback used when every configured synthesis provider is unavailable. */
export function sourceOnlyAssessment(input: { ticker: string; headlineCount: number; publishers: number; latestTitle?: string | null; latestPublisher?: string | null; latestDate?: string | null; tokenizedMarketQuestion: boolean; spotSymbol?: string | null; spotPrice?: number | null; spotTimestamp?: number | null; perpSymbol?: string | null }): FlowAssessment {
  const { ticker } = input;
  const summary = input.tokenizedMarketQuestion
    ? `${input.headlineCount} issuer-level ${ticker} headline${input.headlineCount === 1 ? " was" : "s were"} collected across ${input.publishers} publisher${input.publishers === 1 ? "" : "s"}${input.latestTitle ? `; latest listed item: “${input.latestTitle.slice(0, 120)}”${input.latestPublisher ? ` (${input.latestPublisher}${input.latestDate ? `, ${input.latestDate}` : ""})` : ""}` : ""}. This coverage concerns ${ticker}, not the r${ticker} token market. ${input.spotSymbol && input.spotPrice != null ? `A tokenized spot quote was returned for ${input.spotSymbol} at ${input.spotPrice}; quote freshness ${input.spotTimestamp ? "is shown separately below" : "is unverified"}.` : `No verified r${ticker} tokenized-spot quote was returned.`} ${input.perpSymbol ? `${input.perpSymbol} is a stock-perpetual reference, not the rToken.` : "No stock-perpetual reference was verified."} r${ticker}-specific liquidity, spread, and premium or discount were not measured. Conclusion: not enough evidence to judge whether r${ticker} is worth reviewing as a trading opportunity. A due-diligence review could proceed after verifying token availability, a fresh token quote, liquidity, spread, and premium or discount. AI synthesis is unavailable; no directional assessment was made.`
    : input.headlineCount
      ? `Collected ${input.headlineCount} public headlines across ${input.publishers} publishers${input.latestTitle ? `. Most recent listed headline: “${input.latestTitle.slice(0, 150)}”${input.latestPublisher ? ` (${input.latestPublisher}${input.latestDate ? `, ${input.latestDate}` : ""})` : ""}` : ""}. AI synthesis is unavailable, so review the linked items directly. No directional trade assessment was made.`
      : `No attributable public headlines were reached for ${ticker}. Check the issuer's original filings and retry later.`;
  return { summary, stance: "unclear", confidence: 0, citedUrls: [], supportingEvidence: [], counterEvidence: [], risks: ["AI synthesis is unavailable; retrieved headlines are discovery references only.", ...(input.tokenizedMarketQuestion ? ["Issuer coverage does not establish rToken liquidity, spread, or premium/discount."] : [])], nextCheck: input.tokenizedMarketQuestion ? "Verify the rToken's live availability, quote freshness, liquidity, spread, and premium or discount from instrument-specific sources." : "Review issuer filings and completed candles." };
}

/** Deterministic instrument-specific conclusion, independent of model prose. */
export function tokenizedMarketReview(input: { ticker: string; spotSymbol: string | null; spotPrice: number | null; spotTimestamp: number | null; now: number }) {
  const quoteAvailable = Boolean(input.spotSymbol && typeof input.spotPrice === "number" && Number.isFinite(input.spotPrice) && input.spotPrice > 0);
  const timestampKnown = typeof input.spotTimestamp === "number" && Number.isFinite(input.spotTimestamp) && input.spotTimestamp > 0 && input.spotTimestamp <= input.now + 60_000;
  const quoteFresh = Boolean(quoteAvailable && timestampKnown && input.now - input.spotTimestamp! <= 120_000);
  return {
    verdict: !quoteAvailable
      ? `Not enough evidence for an r${input.ticker} market review: no verified tokenized-spot quote was returned.`
      : `Worth a closer due-diligence review; the available evidence does not establish r${input.ticker} tradability.`,
    quoteStatus: !quoteAvailable ? "unavailable" as const : !timestampKnown ? "unverified" as const : quoteFresh ? "fresh" as const : "stale" as const,
    limitations: ["Order-book liquidity and depth were not measured.", "Bid–ask spread was not measured.", "Premium or discount to the underlying was not measured."],
  };
}

const aliases: Record<string, string[]> = {
  NVDA: ["NVIDIA"], TSLA: ["TESLA"], AAPL: ["APPLE"], AMD: ["ADVANCED MICRO DEVICES"],
  MSFT: ["MICROSOFT"], META: ["META PLATFORMS"], AMZN: ["AMAZON"],
  GOOGL: ["ALPHABET", "GOOGLE"], INTC: ["INTEL"], ASML: ["ASML"],
  QCOM: ["QUALCOMM"], MU: ["MICRON"],
};

/** Only supported Bitget stock perpetual underlyings are inferred, not arbitrary tickers. */
export function extractFlowTickers(question: string, supportedContracts: readonly string[], max = 3): string[] {
  const upper = question.toUpperCase();
  const found = new Set<string>();
  for (const contract of supportedContracts) {
    const ticker = contract.slice(0, -4);
    const terms = [ticker, `R${ticker}`, `R${ticker}USDT`, `${ticker}USDT`, ...(aliases[ticker] ?? [])];
    if (terms.some(term => new RegExp(`(^|[^A-Z0-9])${term}([^A-Z0-9]|$)`, "i").test(upper))) found.add(ticker);
  }
  return [...found].slice(0, max);
}

/** An explanation alone cannot unlock a trade destination. */
export function gateFlowTrade(input: FlowGateInput) {
  const reasons: string[] = [];
  const recent = input.sources.filter(source => source.publishedAt &&
    Date.parse(source.publishedAt) <= input.now + 60_000 &&
    input.now - Date.parse(source.publishedAt) <= 7 * 86_400_000);
  const allowed = new Set(recent.map(source => source.url));
  const cited = new Set(input.assessment.citedUrls.filter(url => allowed.has(url)));
  const publishers = new Set(recent.filter(source => cited.has(source.url)).map(source => source.publisher.trim().toLowerCase()).filter(Boolean));
  if (publishers.size < 2 || cited.size < 2) reasons.push("Fewer than two distinct, recent publishers are cited.");
  const validNow = Number.isFinite(input.now) && input.now > 0;
  if (!validNow || !input.marketVerified || !Number.isFinite(input.marketTimestamp) || !input.marketTimestamp || input.marketTimestamp <= 0 || input.now - input.marketTimestamp > 120_000 || input.marketTimestamp > input.now + 60_000) reasons.push("The verified Bitget market price is unavailable or stale.");
  if (!validNow || !Number.isInteger(input.completedCandles) || input.completedCandles < 60 || !Number.isFinite(input.lastCompletedCandleEnd) || !input.lastCompletedCandleEnd || input.lastCompletedCandleEnd <= 0 || input.now - input.lastCompletedCandleEnd > 6 * 3_600_000 || input.lastCompletedCandleEnd > input.now) reasons.push("The completed Bitget candle series is incomplete or stale.");
  if (!Number.isFinite(input.assessment.confidence) || input.assessment.confidence < 0.75 || input.assessment.confidence > 1) reasons.push("Research confidence is below the 75% review threshold.");
  if (input.assessment.stance !== "bullish" && input.assessment.stance !== "bearish") reasons.push("The evidence does not support a directional scenario.");
  const freshLong = input.currentSignal && !input.previousSignal;
  const freshShort = !input.currentSignal && input.previousSignal;
  if ((input.assessment.stance === "bullish" && !freshLong) || (input.assessment.stance === "bearish" && !freshShort)) reasons.push("No fresh Alpha Factory signal agrees with that scenario.");
  return { tradeable: reasons.length === 0, reasons, direction: input.assessment.stance === "bullish" ? "long" as const : input.assessment.stance === "bearish" ? "short" as const : null };
}

export function normalizeFlowAssessment(value: Record<string, unknown>, sources: FlowSource[], now = Date.now()): FlowAssessment | null {
  const summary = typeof value.summary === "string" ? value.summary.trim().slice(0, 700) : "";
  const stance = value.stance;
  const confidence = typeof value.confidence === "number" ? value.confidence : NaN;
  if (summary.length < 25 || typeof stance !== "string" || !["bullish", "bearish", "mixed", "unclear"].includes(stance) || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) return null;
  const valid = new Set(sources.map(source => source.url));
  const evidencePoints = (items: unknown): FlowEvidencePoint[] => Array.isArray(items)
    ? items.flatMap((item): FlowEvidencePoint[] => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return [];
      const row = item as Record<string, unknown>;
      const text = typeof row.text === "string" ? row.text.trim().slice(0, 260) : "";
      const citedUrls = Array.isArray(row.citedUrls)
        ? [...new Set(row.citedUrls.filter((url): url is string => typeof url === "string" && valid.has(url)))].slice(0, 3)
        : [];
      return text.length >= 12 && citedUrls.length ? [{ text, citedUrls }] : [];
    }).slice(0, 3)
    : [];
  const citedUrls = Array.isArray(value.citedUrls) ? [...new Set(value.citedUrls.filter((url): url is string => typeof url === "string" && valid.has(url)))].slice(0, 6) : [];
  const recentSources = sources.filter(source => source.publishedAt && Number.isFinite(Date.parse(source.publishedAt)) && Date.parse(source.publishedAt) <= now + 60_000 && now - Date.parse(source.publishedAt) <= 7 * 86_400_000);
  const cited = new Set(citedUrls);
  const independentPublishers = new Set(recentSources.filter(source => cited.has(source.url)).map(source => source.publisher.trim().toLowerCase()).filter(Boolean));
  const confidenceCapped = independentPublishers.size < 2;
  const calibratedStance = confidenceCapped && ["bullish", "bearish"].includes(stance) ? "unclear" : stance as FlowStance;
  const calibratedConfidence = confidenceCapped ? Math.min(confidence, 0.4) : confidence;
  return {
    summary, stance: calibratedStance, confidence: calibratedConfidence, confidenceCapped,
    citedUrls,
    supportingEvidence: evidencePoints(value.supportingEvidence),
    counterEvidence: evidencePoints(value.counterEvidence),
    risks: [...(Array.isArray(value.risks) ? value.risks.filter((item): item is string => typeof item === "string").slice(0, 3).map(item => item.slice(0, 200)) : []), ...(confidenceCapped ? ["Directional confidence is capped at 40% until two recent, distinct publishers are cited."] : [])],
    nextCheck: typeof value.nextCheck === "string" ? value.nextCheck.slice(0, 220) : "Review issuer filings and completed candles.",
  };
}

/** A partial or malformed provider response must allow the next provider to try. */
export function normalizeFlowAssessments(value: Record<string, unknown>, sourcesByTicker: Record<string, FlowSource[]>, now = Date.now()): Record<string, FlowAssessment> | null {
  const requested = Object.keys(sourcesByTicker);
  if (!requested.length || !Array.isArray(value.assets)) return null;
  const assessments: Record<string, FlowAssessment> = {};
  for (const item of value.assets) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const candidate = item as Record<string, unknown>;
    const ticker = typeof candidate.ticker === "string" ? candidate.ticker.trim().toUpperCase() : "";
    if (!Object.hasOwn(sourcesByTicker, ticker) || Object.hasOwn(assessments, ticker)) continue;
    const normalized = normalizeFlowAssessment(candidate, sourcesByTicker[ticker], now);
    if (normalized) assessments[ticker] = normalized;
  }
  return requested.every(ticker => Object.hasOwn(assessments, ticker)) ? assessments : null;
}
