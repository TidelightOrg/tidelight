import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBitgetMarketUniverse } from "@/lib/bitget-market";
import { findCatalogRealityAssets } from "@/lib/exposure-map";

function sectorFor(ticker: string | null) {
  const groups: Record<string,string> = {
    NVDA:"Semiconductors & AI", AMD:"Semiconductors & AI", AVGO:"Semiconductors & AI", MSFT:"Cloud & software", GOOGL:"Cloud & advertising", AMZN:"Commerce & cloud", META:"Platforms & advertising", TSLA:"Automotive & autonomy", AAPL:"Consumer technology", JPM:"Financials", WMT:"Consumer staples", SPY:"Broad US equities"
  };
  return ticker ? groups[ticker] ?? "US listed equities" : "Tokenized US market";
}
function context(ticker:string|null) {
 const sector=sectorFor(ticker);
 const isTech=/AI|Semiconductor|Cloud|software|advertising|technology/i.test(sector);
 return {sector,catalysts:isTech?["Issuer guidance and earnings","Product demand, margins, and industry events"]:["Issuer filings and earnings","Sector demand, policy, and market conditions"],risks:["Underlying equity volatility","Token liquidity, tracking, and trading-session differences"]};
}
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to resolve exposure." }, { status: 401 });
  let query="";
  try { const body=await request.json() as {token?:unknown}; query=typeof body.token==="string"?body.token.trim().replace(/\s+/g," ").slice(0,80):""; } catch {}
  if (!query) return NextResponse.json({ error: "Enter a token or issuer name." }, { status: 400 });
  let universe: Awaited<ReturnType<typeof getBitgetMarketUniverse>>;
  try {
    universe=await getBitgetMarketUniverse();
  } catch {
    return NextResponse.json({error:"The live Reality market catalog is unavailable. Exposure cannot be confirmed right now."},{status:503});
  }
  const matches=findCatalogRealityAssets(query,universe.assets).map(asset=>{
    const ticker=asset.underlyingTicker?.toUpperCase()??null, details=context(ticker);
    return {symbol:asset.symbol,name:asset.name,instrument:"rtoken",issuer:asset.name,underlying:ticker??asset.name,sector:details.sector,catalysts:details.catalysts,risks:details.risks,providerTimestamp:asset.providerTimestamp};
  });
  return NextResponse.json({query,matches,catalogObservedAt:new Date(universe.generatedAt).toISOString(),disclaimer:"Reality rToken exposure is returned only when the live Bitget catalog confirms the instrument and underlying ticker. Token and underlying prices, liquidity, trading hours, and legal rights can differ; this is research context, not a recommendation."});
}
