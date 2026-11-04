"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useLanguage } from "@/app/ui/language-provider";
import { appendDecisionCapsuleEvent, getDecisionCapsuleEvents, type DecisionCapsuleHistoryEvent } from "@/lib/decision-capsule-client";

type Forecast = {
  instrument: { type: "us_equity" | "reality_token" | "us_stock_perpetual"; symbol: string };
  referencePrice: number;
  direction: "up" | "down";
  thresholdPercent: number;
  horizonAt: string;
  probability?: number;
};

function localDateTime(value: Date) {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
}

function formatPayload(event: DecisionCapsuleHistoryEvent) {
  const payload = event.payload;
  if (event.type === "forecast") {
    const instrument = payload.instrument as { type?: string; symbol?: string } | undefined;
    return `${instrument?.symbol ?? "Instrument"} · ${instrument?.type?.replaceAll("_", " ") ?? ""} · ${payload.direction === "up" ? "↑" : "↓"} ${payload.thresholdPercent}% from ${payload.referencePrice}`;
  }
  return `${payload.forecastMet ? "Threshold reached" : "Threshold not reached"} · ${Number(payload.actualReturnPercent).toFixed(2)}% · user reported`;
}

export default function DecisionCapsuleHistory({ capsuleId }: { capsuleId: string }) {
  const { translate } = useLanguage();
  const [events, setEvents] = useState<DecisionCapsuleHistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [outcomeForecast, setOutcomeForecast] = useState<DecisionCapsuleHistoryEvent | null>(null);
  const [error, setError] = useState("");
  const [instrumentType, setInstrumentType] = useState<Forecast["instrument"]["type"]>("us_equity");
  const [symbol, setSymbol] = useState("");
  const [referencePrice, setReferencePrice] = useState("");
  const [direction, setDirection] = useState<Forecast["direction"]>("up");
  const [thresholdPercent, setThresholdPercent] = useState("5");
  const [horizonAt, setHorizonAt] = useState(() => localDateTime(new Date(Date.now() + 86_400_000)));
  const [probability, setProbability] = useState("");
  const [observedPrice, setObservedPrice] = useState("");
  const [observedAt, setObservedAt] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceTimestamp, setSourceTimestamp] = useState("");

  const loadHistory = useCallback(() => getDecisionCapsuleEvents(capsuleId), [capsuleId]);
  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try { setEvents(await loadHistory()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : translate("Capsule history could not be loaded.")); }
    finally { setLoading(false); }
  }, [loadHistory, translate]);
  useEffect(() => {
    let current = true;
    loadHistory().then(items => { if (current) setEvents(items); })
      .catch(cause => { if (current) setError(cause instanceof Error ? cause.message : translate("Capsule history could not be loaded.")); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [loadHistory, translate]);

  async function submitForecast(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true); setError("");
    const payload: Forecast = {
      instrument: { type: instrumentType, symbol: symbol.trim().toUpperCase() },
      referencePrice: Number(referencePrice), direction,
      thresholdPercent: Number(thresholdPercent),
      horizonAt: new Date(horizonAt).toISOString(),
      ...(probability.trim() ? { probability: Number(probability) } : {}),
    };
    try {
      await appendDecisionCapsuleEvent(capsuleId, { idempotencyKey: crypto.randomUUID(), type: "forecast", payload });
      setSymbol(""); setReferencePrice(""); setProbability(""); setExpanded(false);
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : translate("Capsule event could not be saved.")); }
    finally { setSubmitting(false); }
  }

  async function submitOutcome(event: FormEvent) {
    event.preventDefault();
    if (!outcomeForecast) return;
    setSubmitting(true); setError("");
    try {
      await appendDecisionCapsuleEvent(capsuleId, {
        idempotencyKey: crypto.randomUUID(), type: "outcome",
        payload: {
          forecastEventId: outcomeForecast.id,
          observedPrice: Number(observedPrice),
          observedAt: new Date(observedAt).toISOString(),
          sourceUrl: sourceUrl.trim(),
          sourceTimestamp: new Date(sourceTimestamp).toISOString(),
        },
      });
      setOutcomeForecast(null); setObservedPrice(""); setObservedAt(""); setSourceUrl(""); setSourceTimestamp("");
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : translate("Capsule event could not be saved.")); }
    finally { setSubmitting(false); }
  }

  return <section className="flow-capsule-history" aria-label={translate("Decision capsule event history")}>
    <header><h3>{translate("Decision history")}</h3><div><span>{loading ? translate("Loading") : `${events.length} / 500`}</span><button type="button" aria-label={translate("Refresh capsule history")} onClick={() => void refresh()} disabled={loading}>↻</button></div></header>
    {error ? <div className="flow-capsule-error" role="alert"><span>{translate(error)}</span><button type="button" onClick={() => void refresh()} disabled={loading}>{translate("Reload history")}</button></div> : null}
    {!loading && events.length ? <ol aria-label={translate("Verified capsule events")}>
      {events.map(event => <li key={event.id}>
        <span className="flow-capsule-event-type">{translate(event.type === "forecast" ? "Forecast" : "Outcome")}</span>
        <span>{formatPayload(event)}</span>
        <time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString()}</time>
        {event.type === "forecast" ? (() => {
          const horizon = Date.parse(String(event.payload.horizonAt));
          const hasOutcome = events.some(item => item.type === "outcome" && item.payload.forecastEventId === event.id);
          if (hasOutcome || !Number.isFinite(horizon) || Date.now() < horizon) return null;
          return <button type="button" onClick={() => { setOutcomeForecast(event); setObservedAt(localDateTime(new Date())); }} aria-label={`${translate("Record outcome for")} ${String((event.payload.instrument as { symbol?: string })?.symbol ?? "forecast")}`}>
            {translate("Record outcome")}
          </button>;
        })() : null}
      </li>)}
    </ol> : null}
    {outcomeForecast ? <form className="flow-capsule-event-form" onSubmit={submitOutcome}>
      <label>{translate("Observed price")}<input type="number" min="0.00000001" step="any" required value={observedPrice} onChange={event => setObservedPrice(event.target.value)} /></label>
      <label>{translate("Observed at")}<input type="datetime-local" required value={observedAt} onChange={event => setObservedAt(event.target.value)} /></label>
      <label>{translate("Source URL")}<input type="url" required value={sourceUrl} onChange={event => setSourceUrl(event.target.value)} /></label>
      <label>{translate("Source timestamp")}<input type="datetime-local" required value={sourceTimestamp} onChange={event => setSourceTimestamp(event.target.value)} /></label>
      <div><button type="submit" disabled={submitting || !sourceTimestamp}>{submitting ? translate("Saving") : translate("Save outcome")}</button><button type="button" onClick={() => setOutcomeForecast(null)}>{translate("Cancel")}</button></div>
    </form> : null}
    {expanded ? <form className="flow-capsule-event-form" onSubmit={submitForecast}>
      <label>{translate("Instrument type")}<select value={instrumentType} onChange={event => setInstrumentType(event.target.value as Forecast["instrument"]["type"])}><option value="us_equity">{translate("US equity")}</option><option value="reality_token">{translate("Reality token")}</option><option value="us_stock_perpetual">{translate("US-stock perpetual")}</option></select></label>
      <label>{translate("Symbol")}<input autoComplete="off" maxLength={16} required value={symbol} onChange={event => setSymbol(event.target.value.toUpperCase())} /></label>
      <label>{translate("Reference price")}<input type="number" min="0.00000001" step="any" required value={referencePrice} onChange={event => setReferencePrice(event.target.value)} /></label>
      <label>{translate("Direction")}<select value={direction} onChange={event => setDirection(event.target.value as Forecast["direction"])}><option value="up">{translate("Up")}</option><option value="down">{translate("Down")}</option></select></label>
      <label>{translate("Threshold %")}<input type="number" min="0.000001" max="100" step="any" required value={thresholdPercent} onChange={event => setThresholdPercent(event.target.value)} /></label>
      <label>{translate("Horizon")}<input type="datetime-local" required value={horizonAt} onChange={event => setHorizonAt(event.target.value)} /></label>
      <label>{translate("Probability") }<input type="number" min="0" max="1" step="any" value={probability} onChange={event => setProbability(event.target.value)} /></label>
      <div><button type="submit" disabled={submitting || !symbol || !referencePrice}>{submitting ? translate("Saving") : translate("Save forecast")}</button><button type="button" onClick={() => setExpanded(false)}>{translate("Cancel")}</button></div>
    </form> : null}
    {!expanded && !outcomeForecast ? <button type="button" className="flow-capsule-add-event" onClick={() => setExpanded(true)} disabled={loading || !!error || events.length >= 500}>{translate("Record forecast")}</button> : null}
  </section>;
}
