"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import IssuerLogo from "@/app/ui/issuer-logo";

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
    <div className="landing-market-signature" role="img" aria-label="Tidelight market research journey: ask about a stock or rToken, research the story, follow evidence, map exposure, paper-test a strategy, review risk, and choose your next move">
      <span className="landing-market-signature-brand">
        <Image src="/tidelight-mark.svg" alt="" width={25} height={25} className="landing-market-signature-logo" />
        <span><b>tidelight</b></span>
      </span>
      <span className="landing-market-story" aria-hidden="true">
        <span className="landing-market-story-step"><b>ASK ABOUT A STOCK OR rTOKEN</b></span>
        <span className="landing-market-story-step"><b>RESEARCH THE STORY</b></span>
        <span className="landing-market-story-step"><b>FOLLOW THE EVIDENCE</b></span>
        <span className="landing-market-story-step"><b>MAP TOKEN EXPOSURE</b></span>
        <span className="landing-market-story-step"><b>TEST A STRATEGY ON PAPER</b></span>
        <span className="landing-market-story-step"><b>REVIEW THE RISKS</b></span>
        <span className="landing-market-story-step"><b>CHOOSE YOUR NEXT MOVE</b></span>
      </span>
      <span className="landing-market-signature-orbit" aria-hidden="true"><i /><i /><i /><i /></span>
    </div>
  </section>;
}
