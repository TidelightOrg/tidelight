import "server-only";
import { getBitgetMarketUniverse, getBitgetStockPerp, STOCK_PERP_UNIVERSE, type MarketAsset } from "@/lib/bitget-market";
import { buildIssuerNewsQueries, gatherIssuerEvidence } from "@/lib/agent-flow-sources";

const supportedTickers = new Set<string>(STOCK_PERP_UNIVERSE.map(symbol => symbol.slice(0, -4)));

export function normalizeResearchTicker(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const ticker = value.trim().toUpperCase();
  return supportedTickers.has(ticker) ? ticker : null;
}

function projectInstrument(asset: MarketAsset) {
  return {
    symbol: asset.symbol,
    instrument_type: "tokenized_equity_spot" as const,
    underlying_ticker: asset.underlyingTicker!,
    issuer_name: asset.name,
    quote_currency: asset.quoteCoin,
    last_price: asset.lastPrice,
    change_24h: asset.change24h,
    provider_timestamp: asset.providerTimestamp,
    market_session_status: asset.marketSessionStatus,
    source: "Bitget Reality spot" as const,
  };
}

export function buildCompanySnapshot(input: {
  ticker: string;
  assets: MarketAsset[];
  perpetual: MarketAsset | null;
  evidence: Awaited<ReturnType<typeof gatherIssuerEvidence>>;
  generatedAt?: number;
}) {
  const tokenizedSpot = input.assets
    .filter(asset => asset.kind === "rtoken" && asset.isReality && asset.underlyingTicker === input.ticker)
    .sort((a, b) => a.symbol.localeCompare(b.symbol))
    .map(projectInstrument);
  const perpetual = input.perpetual?.kind === "rtoken" && !input.perpetual.isReality && input.perpetual.underlyingTicker === input.ticker
    ? {
        symbol: input.perpetual.symbol,
        instrument_type: "stock_perpetual" as const,
        underlying_ticker: input.perpetual.underlyingTicker,
        issuer_name: input.perpetual.name,
        quote_currency: input.perpetual.quoteCoin,
        last_price: input.perpetual.lastPrice,
        change_24h: input.perpetual.change24h,
        provider_timestamp: input.perpetual.providerTimestamp,
        source: "Bitget USDT perpetual" as const,
      }
    : null;
  return {
    type: "company_snapshot" as const,
    ticker: input.ticker,
    generated_at: new Date(input.generatedAt ?? Date.now()).toISOString(),
    market: {
      tokenized_equity_spot: tokenizedSpot,
      stock_perpetual: perpetual,
    },
    evidence: {
      mode: "multi_query_headline_discovery" as const,
      note: "Recent public headline discovery across multiple bounded queries. Headlines and snippets are pointers, not verified article contents, complete coverage, or independent research conclusions.",
      coverage: { query_count: buildIssuerNewsQueries(input.ticker, input.ticker).length * 2, lookback_days: 30, source_domains: [...new Set(input.evidence.map(source => new URL(source.url).hostname))].length, retrieved_at: new Date(input.generatedAt ?? Date.now()).toISOString(), returned_items: input.evidence.length, publishers: [...new Set(input.evidence.map(source => source.publisher))].length },
      items: input.evidence.slice(0, 40).map(source => ({
        title: source.title.slice(0, 300),
        url: source.url,
        publisher: source.publisher.slice(0, 120),
        published_at: source.publishedAt,
        snippet: source.snippet.slice(0, 400),
        discovered_via: (source.via ?? "unknown").slice(0, 40),
      })),
    },
    limitations: [
      "Tokenized equity spot instruments and stock perpetuals are different products from direct US stock shares.",
      "This snapshot does not provide a valuation, forecast, recommendation, or order instruction.",
    ],
  };
}

export async function runCompanySnapshot(ticker: string) {
  const marketPromise = getBitgetMarketUniverse();
  const [market, perpetual, evidence] = await Promise.all([
    marketPromise,
    getBitgetStockPerp(`${ticker}USDT`),
    gatherIssuerEvidence(ticker, ticker),
  ]);
  return buildCompanySnapshot({ ticker, assets: market.assets, perpetual, evidence, generatedAt: Date.now() });
}
