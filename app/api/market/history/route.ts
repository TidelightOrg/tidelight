import { NextResponse } from "next/server";
import { getBitgetCandles, type MarketCandle } from "@/lib/bitget-market";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get("symbol") ?? "").toUpperCase().match(/^[A-Z0-9]{2,32}$/)?.[0];
  if (!symbol) return NextResponse.json({ error: "Invalid market symbol." }, { status: 400 });
  let candles: MarketCandle[];
  try {
    candles = await getBitgetCandles(symbol, "4H", 120);
  } catch {
    return NextResponse.json({ error: "Bitget candle history is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  const fourHours = 4 * 60 * 60 * 1000;
  const receivedAt = Date.now();
  const providerTimestamp = candles.find(candle => candle.providerTimestamp != null)?.providerTimestamp ?? null;
  const completed = candles.filter((candle) => candle.providerTimestamp != null && candle.timestamp + fourHours <= candle.providerTimestamp && candle.timestamp + fourHours <= receivedAt);
  return NextResponse.json({ source: "Bitget", marketCategory: "SPOT", symbol, interval: "4H", providerTimestamp, receivedAt, timestampTimezone: "UTC", candleFinality: providerTimestamp == null ? "unverified" : "provider_timestamp_checked", candles: completed.map((candle) => ({ t: candle.timestamp, c: candle.close, providerTimestamp: candle.providerTimestamp, finality: "verified_closed" })) }, { headers: { "Cache-Control": "no-store" } });
}
