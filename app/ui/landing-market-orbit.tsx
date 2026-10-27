"use client";

import { useEffect, useMemo, useState } from "react";
import IssuerLogo from "@/app/ui/issuer-logo";
import TidelightDotWordmark from "@/app/ui/tidelight-dot-wordmark";

type Market = { symbol: string; baseCoin: string; underlyingTicker: string | null; name: string; logoUrl: string | null; isReality: boolean; kind: string };
type MarketResponse = { assets?: Market[]; generatedAt?: number; coverage?: { rTokens?: number } };

const FALLBACK_MARKETS: Market[] = [
  { symbol: "RNVDA", baseCoin: "RNVDA", underlyingTicker: "NVDA", name: "NVIDIA", logoUrl: "https://www.google.com/s2/favicons?domain=nvidia.com&sz=128", isReality: true, kind: "rtoken" },
  { symbol: "RAAPL", baseCoin: "RAAPL", underlyingTicker: "AAPL", name: "Apple", logoUrl: "https://www.google.com/s2/favicons?domain=apple.com&sz=128", isReality: true, kind: "rtoken" },
  { symbol: "RTSLA", baseCoin: "RTSLA", underlyingTicker: "TSLA", name: "Tesla", logoUrl: "https://www.google.com/s2/favicons?domain=tesla.com&sz=128", isReality: true, kind: "rtoken" },
  { symbol: "RMSFT", baseCoin: "RMSFT", underlyingTicker: "MSFT", name: "Microsoft", logoUrl: "https://www.google.com/s2/favicons?domain=microsoft.com&sz=128", isReality: true, kind: "rtoken" },
  { symbol: "RAMZN", baseCoin: "RAMZN", underlyingTicker: "AMZN", name: "Amazon", logoUrl: "https://www.google.com/s2/favicons?domain=amazon.com&sz=128", isReality: true, kind: "rtoken" },
];

export function LandingMarketOrbit() {
  const [markets, setMarkets] = useState<Market[]>(FALLBACK_MARKETS);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    fetch("/api/market/universe", { signal: controller.signal, cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<MarketResponse> : null)
      .then((result) => {
        if (!active || !result) return;
        const verified = (result.assets ?? []).filter((asset) => asset.isReality && asset.kind === "rtoken" && asset.underlyingTicker);
        if (verified.length) setMarkets(verified);
        if (Number.isFinite(result.coverage?.rTokens)) setCount(result.coverage!.rTokens!);
      })
      .catch(() => undefined);
    return () => { active = false; controller.abort(); };
  }, []);

  // A focused sample keeps logo requests modest while the count reflects the
  // complete currently supported Bitget Reality catalog.
  const visibleMarkets = useMemo(() => markets.slice(0, 18), [markets]);

  return <section className="landing-market-ribbon" aria-label={`Rotating examples from ${count ? `${count} ` : "the supported "}Bitget Reality rToken markets`}>
    <div className="landing-market-cylinder">
      <div className="landing-market-cylinder-head"><span><i /><span className="landing-market-label-full">BITGET REALITY / SPOT</span><span className="landing-market-label-short">BITGET</span></span><small>{count ? `${count} supported rTokens` : "Supported rTokens"} <b>·</b> Live catalog</small></div>
      <div className="landing-market-viewport">
        <div className="landing-market-track">
          {[...visibleMarkets, ...visibleMarkets].map((market, index) => <div className="landing-market-chip" key={`${market.symbol}-${index}`} title={`${market.name} · ${market.underlyingTicker} Reality token`}>
            <IssuerLogo ticker={market.underlyingTicker ?? market.baseCoin} logoUrl={market.logoUrl} className="landing-market-logo" />
            <span><b>{market.underlyingTicker}</b><small>rToken</small></span>
          </div>)}
        </div>
      </div>
    </div>
    <div className="landing-market-signature" aria-hidden="true">
      <svg className="landing-market-signature-wave" viewBox="0 0 180 36" fill="none">
        <path d="M2 21c16 0 16-11 32-11s16 22 32 22 16-30 32-30 16 17 32 17 16-9 32-9 16 12 18 12" />
        <path d="M2 25c16 0 16-8 32-8s16 16 32 16 16-22 32-22 16 13 32 13 16-7 32-7 16 8 18 8" />
        <circle cx="34" cy="10" r="2.2" /><circle cx="98" cy="2" r="2.2" /><circle cx="162" cy="10" r="2.2" />
      </svg>
      <TidelightDotWordmark className="landing-market-signature-wordmark" />
      <span className="landing-market-signature-label">EVERY SIGNAL HAS A SOURCE</span>
    </div>
  </section>;
}
