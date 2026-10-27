"use client";

import { useEffect, useMemo, useState } from "react";
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
    <div className="landing-market-signature" role="img" aria-label="Tidelight: question, evidence, exposure, decision">
      <span className="landing-market-signature-brand">
        <svg viewBox="0 0 28 28" aria-hidden="true"><path d="M3 17.5c4.1 0 4.1-7 8.2-7s4.1 7 8.2 7 4.1-7 8.2-7" /><circle cx="11.2" cy="10.5" r="1.6" /><circle cx="19.4" cy="17.5" r="1.6" /></svg>
        <b>TIDELIGHT</b>
      </span>
      <span className="landing-market-signature-window" aria-hidden="true">
        <span className="landing-market-signature-track">
          {[0, 1].map((copy) => <span className="landing-market-signature-run" key={copy}>
            {["QUESTION", "EVIDENCE", "EXPOSURE", "DECISION"].map((word, index) => <span className="landing-market-signature-word" key={word}>{word}{index < 3 ? <i /> : null}</span>)}
          </span>)}
        </span>
      </span>
      <span className="landing-market-signature-live"><i /> LIVE</span>
    </div>
  </section>;
}
