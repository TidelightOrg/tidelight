import { isRealityCatalogInstrument } from "./instrument-identity.ts";

export type ResearchExposure = {
  ticker: string;
  issuer: string;
  sector: string;
  realityPair: null;
  match: "ticker" | "company";
  scenarios: { upside: string; downside: string; invalidation: string };
};

const issuers: Array<Omit<ResearchExposure, "realityPair" | "match" | "scenarios"> & { aliases: string[] }> = [
  { ticker: "NVDA", issuer: "NVIDIA Corporation", sector: "Semiconductors", aliases: ["nvda", "nvidia"] },
  { ticker: "TSLA", issuer: "Tesla, Inc.", sector: "Mobility", aliases: ["tsla", "tesla"] },
  { ticker: "MSFT", issuer: "Microsoft Corporation", sector: "Cloud & AI", aliases: ["msft", "microsoft"] },
  { ticker: "AAPL", issuer: "Apple Inc.", sector: "Consumer technology", aliases: ["aapl", "apple"] },
  { ticker: "AMZN", issuer: "Amazon.com, Inc.", sector: "Commerce & cloud", aliases: ["amzn", "amazon"] },
  { ticker: "META", issuer: "Meta Platforms, Inc.", sector: "Platforms & advertising", aliases: ["meta", "facebook"] },
  { ticker: "AMD", issuer: "Advanced Micro Devices, Inc.", sector: "Semiconductors", aliases: ["amd", "advanced micro devices"] },
  { ticker: "GOOGL", issuer: "Alphabet Inc.", sector: "Cloud & advertising", aliases: ["googl", "alphabet", "google"] },
  { ticker: "JPM", issuer: "JPMorgan Chase & Co.", sector: "Financials", aliases: ["jpm", "jpmorgan"] },
  { ticker: "WMT", issuer: "Walmart Inc.", sector: "Consumer staples", aliases: ["wmt", "walmart"] },
  { ticker: "NFLX", issuer: "Netflix, Inc.", sector: "Streaming & media", aliases: ["nflx", "netflix"] },
  { ticker: "COIN", issuer: "Coinbase Global, Inc.", sector: "Digital assets", aliases: ["coin", "coinbase"] },
];

type RealityCatalogEntry = {
  symbol: string;
  baseCoin: string;
  name: string;
  underlyingTicker: string | null;
  kind: string;
  isReality: boolean;
};

function lookupKey(value: string) {
  return value.normalize("NFKC").toUpperCase().replace(/[^A-Z0-9.]/g, "");
}

export function findCatalogRealityAssets<T extends RealityCatalogEntry>(query: string, assets: readonly T[]): T[] {
  const key = lookupKey(query);
  if (!key) return [];
  return assets.flatMap((asset) => {
    if (!asset.underlyingTicker) return [];
    if (!isRealityCatalogInstrument(asset)) return [];
    const underlying = lookupKey(asset.underlyingTicker);
    const candidates = [lookupKey(asset.symbol), lookupKey(asset.baseCoin), underlying];
    const normalizedName = lookupKey(asset.name);
    const rank = candidates.findIndex((candidate) => candidate === key);
    if (rank >= 0) return [{ asset, rank }];
    if (normalizedName === key) return [{ asset, rank: 3 }];
    if (key.length >= 4 && normalizedName.includes(key)) return [{ asset, rank: 4 }];
    return [];
  }).sort((left, right) => left.rank - right.rank || left.asset.symbol.localeCompare(right.asset.symbol)).slice(0, 5).map(({ asset }) => asset);
}

export function mapResearchExposure(text: string): ResearchExposure[] {
  const normalized = text.toLocaleLowerCase();
  return issuers.flatMap(({ aliases, ...item }) => {
    const match = aliases.some((alias) => new RegExp(`(^|[^a-z0-9])${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=$|[^a-z0-9])`, "i").test(normalized));
    if (!match) return [];
    const scenarios = item.sector === "Semiconductors"
      ? { upside: "Demand, pricing, or supply access improves for the issuer.", downside: "Export controls, supply disruption, or weaker compute demand pressures the issuer.", invalidation: "New guidance or filings show the event is not material to revenue or supply." }
      : item.sector.includes("Financial") || item.sector === "Digital assets"
        ? { upside: "Liquidity, risk appetite, or transaction activity improves.", downside: "Funding stress, regulation, or risk-off flows reduce activity.", invalidation: "Primary disclosures show no material balance-sheet, regulatory, or flow impact." }
        : { upside: "The event supports demand, margins, or forward guidance.", downside: "The event pressures demand, costs, regulation, or execution.", invalidation: "Company guidance or a primary source materially narrows the expected impact." };
    return [{ ...item, realityPair: null, match: aliases[0] === item.ticker.toLocaleLowerCase() ? "ticker" as const : "company" as const, scenarios }];
  });
}
