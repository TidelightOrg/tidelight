"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/app/ui/language-provider";
import { formatPublicCapsulePrice } from "@/lib/decision-capsule-format";
import { verifyPublicCapsulePublication, type PublicCapsulePublication } from "@/lib/public-capsule-integrity";

type JsonRecord = Record<string, unknown>;
const isRecord = (value: unknown): value is JsonRecord => Boolean(value && typeof value === "object" && !Array.isArray(value));
const stringValue = (value: unknown) => typeof value === "string" ? value : "";
const publicSourceUrl = (value: unknown) => {
  if (typeof value !== "string" || value.length > 2_048) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname && !url.username && !url.password ? url.toString() : null;
  } catch { return null; }
};
const dateValue = (value: unknown) => {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return null;
  return new Date(value).toLocaleString();
};

function ResearchSummary({ value, translate }: { value: unknown; translate: (value: string) => string }) {
  if (typeof value === "string") return <p>{value}</p>;
  if (!isRecord(value)) return <p>{translate("No disclosed research summary.")}</p>;
  const assets = Array.isArray(value.assets) ? value.assets.filter(isRecord) : [];
  return <div className="public-capsule-assets">
    {assets.map((asset, index) => <article key={`${stringValue(asset.ticker)}-${index}`}>
      <header><strong>{stringValue(asset.ticker)}</strong><span>{stringValue(asset.issuer)}</span></header>
      {asset.summary ? <p>{stringValue(asset.summary)}</p> : null}
      <div>{asset.stance ? <span>{stringValue(asset.stance)}</span> : null}{typeof asset.confidence === "number" ? <span>{Math.round(asset.confidence * 100)}%</span> : null}</div>
      {Array.isArray(asset.risks) && asset.risks.length ? <ul>{asset.risks.map((risk, riskIndex) => <li key={riskIndex}>{stringValue(risk)}</li>)}</ul> : null}
    </article>)}
    {!assets.length ? <p>{translate("No disclosed research summary.")}</p> : null}
  </div>;
}

function Evidence({ value, translate }: { value: unknown; translate: (value: string) => string }) {
  if (!isRecord(value)) return null;
  const sources = Array.isArray(value.sources) ? value.sources.filter(isRecord) : [];
  const claims = Array.isArray(value.claims) ? value.claims.filter(isRecord) : [];
  return <section className="public-capsule-section">
    <h2>{translate("Evidence")}</h2>
    {sources.length ? <ul className="public-capsule-sources">{sources.map((source, index) => <li key={`${stringValue(source.url)}-${index}`}>
      <div><strong>{stringValue(source.title) || stringValue(source.url)}</strong><span>{stringValue(source.publisher)}{dateValue(source.publishedAt) ? ` · ${dateValue(source.publishedAt)}` : ""}</span></div>
      {publicSourceUrl(source.url) ? <a href={publicSourceUrl(source.url) ?? undefined} target="_blank" rel="noopener noreferrer" aria-label={`${translate("Open source")}: ${stringValue(source.title) || source.url}`}>↗</a> : null}
      {source.excerpt ? <blockquote>{stringValue(source.excerpt)}</blockquote> : null}
    </li>)}</ul> : null}
    {claims.length ? <ul className="public-capsule-claims">{claims.map((claim, index) => <li key={index}>
      <header><b>{translate(claim.stance === "supports" ? "Supports" : claim.stance === "contradicts" ? "Challenges" : "Context")}</b>{typeof claim.confidence === "number" ? <span>{Math.round(claim.confidence * 100)}%</span> : null}</header>
      <p>{stringValue(claim.claim)}</p>
      {claim.supportingQuote ? <blockquote>{stringValue(claim.supportingQuote)}</blockquote> : null}
      {claim.claimSupportStatus === "not_independently_verified" ? <small className="public-capsule-claim-limit">{translate("Claim support and truth have not been independently verified.")}</small> : null}
      {publicSourceUrl(claim.sourceUrl) ? <a href={publicSourceUrl(claim.sourceUrl) ?? undefined} target="_blank" rel="noopener noreferrer">{translate("Open source")} ↗</a> : null}
    </li>)}</ul> : null}
    {!sources.length && !claims.length ? <p>{translate("No evidence was included in this public copy.")}</p> : null}
  </section>;
}

function CapsuleEvents({ value, translate }: { value: unknown; translate: (value: string) => string }) {
  if (!Array.isArray(value)) return null;
  const events = value.filter(isRecord);
  const forecasts = new Map<number, JsonRecord>();
  const directionLabel = (direction: unknown) => direction === "up" ? translate("Up") : direction === "down" ? translate("Down") : stringValue(direction);
  for (const event of events) if (event.type === "forecast" && typeof event.sequence === "number" && isRecord(event.payload)) forecasts.set(event.sequence, event.payload);
  return <section className="public-capsule-section">
    <h2>{translate("Forecast history")}</h2>
    {events.length ? <ol className="public-capsule-events">{events.map((event, index) => {
      const payload = isRecord(event.payload) ? event.payload : {};
      const instrument = isRecord(payload.instrument) ? payload.instrument : {};
      const isOutcome = event.type === "outcome";
      const forecastSequence = isOutcome && typeof event.forecastSequence === "number" ? event.forecastSequence : null;
      const referencedForecast = forecastSequence === null ? null : forecasts.get(forecastSequence) ?? null;
      const referencedInstrument = isRecord(referencedForecast?.instrument) ? referencedForecast.instrument : {};
      const symbol = stringValue(isOutcome ? referencedInstrument.symbol : instrument.symbol);
      const instrumentType = stringValue(isOutcome ? referencedInstrument.type : instrument.type);
      const instrumentClass = instrumentType === "us_equity" ? translate("US equity")
        : instrumentType === "reality_token" ? translate("Reality token")
          : instrumentType === "us_stock_perpetual" ? translate("US-stock perpetual") : "";
      const instrumentIdentity = symbol ? `${symbol}${instrumentClass ? ` · ${instrumentClass}` : ""} · ` : "";
      const sourceUrl = publicSourceUrl(isOutcome ? payload.sourceUrl : payload.referenceSourceUrl);
      const sourceTimestamp = isOutcome ? payload.sourceTimestamp : payload.referenceSourceTimestamp;
      return <li key={index}>
        <header><strong>{isOutcome ? `${translate("Outcome")} · ${translate("Forecast")} #${forecastSequence ?? "—"}` : `${translate("Forecast")} #${typeof event.sequence === "number" ? event.sequence : index + 1}`}</strong><time>{dateValue(event.createdAt) ?? "—"}</time></header>
        {isOutcome ? <p>{instrumentIdentity}{referencedForecast ? `${translate("Forecast")}: ${directionLabel(referencedForecast.direction)} ${typeof referencedForecast.thresholdPercent === "number" ? `${referencedForecast.thresholdPercent}%` : ""} · ` : ""}{typeof payload.forecastMet === "boolean" ? translate(payload.forecastMet ? "Met" : "Not met") + " · " : ""}{translate("Observed price")} {formatPublicCapsulePrice(payload.observedPrice)} · {typeof payload.actualReturnPercent === "number" ? `${payload.actualReturnPercent.toFixed(2)}%` : "—"}</p> : <p>{instrumentIdentity}{directionLabel(payload.direction)} · {translate("Reference price")} {formatPublicCapsulePrice(payload.referencePrice)} · {typeof payload.thresholdPercent === "number" ? `${payload.thresholdPercent}%` : "—"}</p>}
        <div className="public-capsule-event-meta">
          {isOutcome ? <span className="public-capsule-reported">{translate("Reported by user")}</span> : payload.horizonAt ? <span>{translate("Horizon")} · {dateValue(payload.horizonAt) ?? "—"}</span> : null}
          {typeof sourceTimestamp === "string" && dateValue(sourceTimestamp) ? <time dateTime={sourceTimestamp}>{translate("Source timestamp")} · {dateValue(sourceTimestamp)}</time> : null}
          {sourceUrl ? <a href={sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`${translate("Open price source")}: ${symbol || translate("Public record")}`}>{translate("Open price source")} ↗</a> : null}
          {(isOutcome ? payload.sourceUrlRedacted : payload.referenceSourceUrlRedacted) === true ? <span className="public-capsule-source-redacted">{translate("Source link redacted")}</span> : null}
        </div>
      </li>;
    })}</ol> : <p>{translate("No forecast history was included.")}</p>}
  </section>;
}

export default function PublicCapsuleViewer({ token }: { token: string }) {
  const { translate } = useLanguage();
  const [publication, setPublication] = useState<PublicCapsulePublication | null>(null);
  const [error, setError] = useState<"unavailable" | "unverified" | null>(null);
  const tokenValid = /^[A-Za-z0-9_-]{43}$/.test(token);
  useEffect(() => {
    const controller = new AbortController();
    if (!tokenValid) return () => controller.abort();
    fetch(`/api/decision-capsules/public/${token}`, { cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("unavailable");
        const value: unknown = await response.json();
        const verified = await verifyPublicCapsulePublication(value);
        if (!verified) { setError("unverified"); return; }
        setPublication(verified);
      })
      .catch(() => { if (!controller.signal.aborted) setError("unavailable"); });
    return () => controller.abort();
  }, [token, tokenValid]);

  if (error || !tokenValid) return <main className="public-capsule-page"><header className="public-capsule-top"><Link href="/">TIDELIGHT</Link><span>{translate("Public record")}</span></header><section className="public-capsule-empty"><h1>{translate(error === "unverified" ? "Capsule could not be verified" : "Capsule unavailable")}</h1></section></main>;
  if (!publication) return <main className="public-capsule-page" aria-busy="true"><header className="public-capsule-top"><Link href="/">TIDELIGHT</Link><span>{translate("Public record")}</span></header><div className="public-capsule-skeleton" aria-label={translate("Loading")}/></main>;
  const snapshot = publication.snapshot;
  const research = isRecord(snapshot.research) ? snapshot.research : null;
  const evidence = isRecord(snapshot.evidence) ? snapshot.evidence : null;
  const events = Array.isArray(snapshot.events) ? snapshot.events : null;
  const researchQuestion = stringValue(research?.question);
  return <main className="public-capsule-page">
    <header className="public-capsule-top"><Link href="/">TIDELIGHT</Link><span>{translate("Public record")}</span></header>
    <article className="public-capsule-card">
      <header className="public-capsule-heading"><div><span className="public-capsule-eyebrow">{translate("Decision Capsule")}</span><h1>{researchQuestion || translate("Decision Capsule")}</h1></div><span className="public-capsule-integrity">{translate("Copy integrity verified")}</span></header>
      <div className="public-capsule-meta"><div><span>{translate("Published")}</span><time>{dateValue(publication.publishedAt) ?? "—"}</time></div><div><span>{translate("SHA-256")}</span><code>{publication.integrityHash}</code></div><a href={`/api/decision-capsules/public/${token}?download=1`}>{translate("Download JSON")} ↗</a></div>
      {research ? <section className="public-capsule-section"><h2>{translate("Research")}</h2><ResearchSummary value={research.summary} translate={translate}/></section> : null}
      <Evidence value={evidence} translate={translate}/>
      <CapsuleEvents value={events} translate={translate}/>
    </article>
  </main>;
}
