import { createHash, timingSafeEqual } from "node:crypto";
import { canonicalJson } from "./decision-capsules";

export const MAX_CAPSULE_EVENTS = 500;
export const MAX_CAPSULE_EVENT_BYTES = 16 * 1024;
export const CAPSULE_EVENT_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SYMBOLS = {
  us_equity: /^[A-Z][A-Z0-9.-]{0,14}$/,
  reality_token: /^R[A-Z0-9.-]{1,15}$/,
  us_stock_perpetual: /^[A-Z0-9]{1,16}USDT$/,
} as const;

export type CapsuleInstrumentType = keyof typeof SYMBOLS;
export type CapsuleForecastPayload = {
  instrument: { type: CapsuleInstrumentType; symbol: string };
  referencePrice: number;
  direction: "up" | "down";
  thresholdPercent: number;
  horizonAt: string;
  probability?: number;
};
export type CapsuleOutcomePayload = {
  forecastEventId: string;
  observedPrice: number;
  observedAt: string;
  sourceUrl: string;
  sourceTimestamp: string;
  reportedBy: "user";
  actualReturnPercent: number;
  forecastMet: boolean;
  brierScore?: number;
};
export type CapsuleOutcomeInput = Pick<CapsuleOutcomePayload, "forecastEventId" | "observedPrice" | "observedAt" | "sourceUrl" | "sourceTimestamp">;
export type CapsuleEventType = "forecast" | "outcome";
export type CapsuleEventPayload = CapsuleForecastPayload | CapsuleOutcomePayload;
export type CapsuleEvent = {
  id: string;
  capsuleId: string;
  sequence: number;
  type: CapsuleEventType;
  idempotencyKey: string;
  forecastEventId: string | null;
  payload: CapsuleEventPayload;
  previousHash: string;
  integrityHash: string;
  createdAt: string;
};
export type CapsuleEventRow = {
  id: string; capsule_id: string; user_id: string; sequence: number; event_type: string;
  idempotency_key: string; forecast_event_id: string | null; payload: unknown;
  previous_hash: string; integrity_hash: string; created_at: string;
};
export type CapsuleEventInput =
  | { idempotencyKey: string; type: "forecast"; payload: CapsuleForecastPayload; forecastEventId: null }
  | { idempotencyKey: string; type: "outcome"; payload: CapsuleOutcomeInput; forecastEventId: string };

export class CapsuleEventValidationError extends Error {
  constructor(message: string) { super(message); this.name = "CapsuleEventValidationError"; }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}
function exactKeys(value: Record<string, unknown>, keys: string[]) {
  return Object.keys(value).every(key => keys.includes(key)) && keys.every(key => Object.hasOwn(value, key));
}
function parseTimestamp(value: unknown, label: string): string {
  if (typeof value !== "string") throw new CapsuleEventValidationError(`${label} must be a UTC timestamp.`);
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?Z$/.exec(value);
  if (!match) throw new CapsuleEventValidationError(`${label} must be a UTC timestamp.`);
  const time = Date.parse(value);
  if (!Number.isFinite(time)) throw new CapsuleEventValidationError(`${label} must be a valid timestamp.`);
  const [, year, month, day, hour, minute, second] = match;
  const parsed = new Date(time);
  if (parsed.getUTCFullYear() !== Number(year) || parsed.getUTCMonth() + 1 !== Number(month)
    || parsed.getUTCDate() !== Number(day) || parsed.getUTCHours() !== Number(hour)
    || parsed.getUTCMinutes() !== Number(minute) || parsed.getUTCSeconds() !== Number(second)) {
    throw new CapsuleEventValidationError(`${label} must be a valid timestamp.`);
  }
  return new Date(time).toISOString();
}
function finiteRange(value: unknown, min: number, max: number, label: string) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) throw new CapsuleEventValidationError(`${label} is outside its supported range.`);
  return value;
}

export function parseCapsuleEventInput(value: unknown, now = Date.now()): CapsuleEventInput {
  if (!isPlainObject(value) || !exactKeys(value, ["idempotencyKey", "type", "payload"])) throw new CapsuleEventValidationError("Send an idempotency key, event type, and event payload.");
  if (typeof value.idempotencyKey !== "string" || !CAPSULE_EVENT_UUID.test(value.idempotencyKey)) throw new CapsuleEventValidationError("A valid idempotency key is required.");
  if (value.type === "forecast") {
    const raw = value.payload;
    if (!isPlainObject(raw) || !exactKeys(raw, ["instrument", "referencePrice", "direction", "thresholdPercent", "horizonAt", ...(Object.hasOwn(raw, "probability") ? ["probability"] : [])])) throw new CapsuleEventValidationError("The forecast fields are incomplete or unsupported.");
    const instrument = raw.instrument;
    if (!isPlainObject(instrument) || !exactKeys(instrument, ["type", "symbol"]) || typeof instrument.type !== "string" || !Object.hasOwn(SYMBOLS, instrument.type) || typeof instrument.symbol !== "string" || instrument.symbol !== instrument.symbol.toUpperCase() || !SYMBOLS[instrument.type as CapsuleInstrumentType].test(instrument.symbol)) throw new CapsuleEventValidationError("Use an exact symbol for a supported US equity, Reality token, or US-stock perpetual.");
    if (raw.direction !== "up" && raw.direction !== "down") throw new CapsuleEventValidationError("Choose an upward or downward forecast.");
    const horizonAt = parseTimestamp(raw.horizonAt, "Forecast horizon");
    const horizonMs = Date.parse(horizonAt);
    if (horizonMs <= now || horizonMs > now + 5 * 366 * 24 * 60 * 60 * 1000) throw new CapsuleEventValidationError("Forecast horizon must be in the future and within five years.");
    const payload: CapsuleForecastPayload = {
      instrument: { type: instrument.type as CapsuleInstrumentType, symbol: instrument.symbol },
      referencePrice: finiteRange(raw.referencePrice, Number.MIN_VALUE, 1e15, "Reference price"),
      direction: raw.direction,
      thresholdPercent: finiteRange(raw.thresholdPercent, 0.000001, 100, "Threshold"),
      horizonAt,
      ...(Object.hasOwn(raw, "probability") ? { probability: finiteRange(raw.probability, 0, 1, "Probability") } : {}),
    };
    if (Buffer.byteLength(canonicalJson(payload), "utf8") > MAX_CAPSULE_EVENT_BYTES) throw new CapsuleEventValidationError("The event is too large.");
    return { idempotencyKey: value.idempotencyKey, type: "forecast", payload, forecastEventId: null };
  }
  if (value.type === "outcome") {
    const raw = value.payload;
    if (!isPlainObject(raw) || !exactKeys(raw, ["forecastEventId", "observedPrice", "observedAt", "sourceUrl", "sourceTimestamp"])) throw new CapsuleEventValidationError("The outcome fields are incomplete or unsupported.");
    if (typeof raw.forecastEventId !== "string" || !CAPSULE_EVENT_UUID.test(raw.forecastEventId)) throw new CapsuleEventValidationError("A valid forecast event ID is required.");
    if (typeof raw.sourceUrl !== "string" || raw.sourceUrl.length > 2_048) throw new CapsuleEventValidationError("A valid outcome source URL is required.");
    let url: URL;
    try { url = new URL(raw.sourceUrl); } catch { throw new CapsuleEventValidationError("A valid outcome source URL is required."); }
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password) throw new CapsuleEventValidationError("Outcome sources must use an HTTPS URL without credentials.");
    const observedAt = parseTimestamp(raw.observedAt, "Observation time");
    const sourceTimestamp = parseTimestamp(raw.sourceTimestamp, "Source timestamp");
    if (Date.parse(observedAt) > now + 60_000 || Date.parse(sourceTimestamp) > now + 60_000) throw new CapsuleEventValidationError("Outcome timestamps cannot be in the future.");
    const observedPrice = finiteRange(raw.observedPrice, Number.MIN_VALUE, 1e15, "Observed price");
    const payload = { forecastEventId: raw.forecastEventId, observedPrice, observedAt, sourceUrl: url.toString(), sourceTimestamp, reportedBy: "user" as const };
    if (Buffer.byteLength(canonicalJson(payload), "utf8") > MAX_CAPSULE_EVENT_BYTES) throw new CapsuleEventValidationError("The event is too large.");
    return { idempotencyKey: value.idempotencyKey, type: "outcome", payload, forecastEventId: raw.forecastEventId };
  }
  throw new CapsuleEventValidationError("Choose a supported capsule event type.");
}

export function buildCapsuleOutcomePayload(forecast: CapsuleEvent, input: CapsuleOutcomeInput): CapsuleOutcomePayload {
  if (forecast.type !== "forecast" || forecast.payload === null || typeof forecast.payload !== "object" || !("referencePrice" in forecast.payload)) throw new CapsuleEventValidationError("The referenced capsule event is not a forecast.");
  if (input.forecastEventId !== forecast.id) throw new CapsuleEventValidationError("Outcome forecast identity does not match.");
  const actualReturnPercent = (input.observedPrice / forecast.payload.referencePrice - 1) * 100;
  if (!Number.isFinite(actualReturnPercent)) throw new CapsuleEventValidationError("Outcome return could not be calculated.");
  const forecastMet = forecast.payload.direction === "up"
    ? actualReturnPercent >= forecast.payload.thresholdPercent
    : actualReturnPercent <= -forecast.payload.thresholdPercent;
  const probability = forecast.payload.probability;
  return {
    ...input,
    reportedBy: "user",
    actualReturnPercent,
    forecastMet,
    ...(probability === undefined ? {} : { brierScore: (probability - (forecastMet ? 1 : 0)) ** 2 }),
  };
}

export function hashCapsuleEvent(event: Omit<CapsuleEvent, "integrityHash">): string {
  return createHash("sha256").update(canonicalJson(event), "utf8").digest("hex");
}
export function mapCapsuleEvent(row: CapsuleEventRow): CapsuleEvent | null {
  if ((row.event_type !== "forecast" && row.event_type !== "outcome") || !isPlainObject(row.payload) || !CAPSULE_EVENT_UUID.test(row.id) || !CAPSULE_EVENT_UUID.test(row.capsule_id) || !CAPSULE_EVENT_UUID.test(row.idempotency_key) || !Number.isSafeInteger(row.sequence) || row.sequence < 1 || typeof row.previous_hash !== "string" || typeof row.integrity_hash !== "string" || !CAPSULE_EVENT_UUID.test(row.user_id) || !Number.isFinite(Date.parse(row.created_at))) return null;
  if (row.forecast_event_id !== null && !CAPSULE_EVENT_UUID.test(row.forecast_event_id)) return null;
  return {
    id: row.id, capsuleId: row.capsule_id, sequence: row.sequence, type: row.event_type,
    idempotencyKey: row.idempotency_key, forecastEventId: row.forecast_event_id,
    payload: row.payload as CapsuleEventPayload, previousHash: row.previous_hash,
    integrityHash: row.integrity_hash, createdAt: new Date(row.created_at).toISOString(),
  };
}

function isForecastPayload(value: unknown): value is CapsuleForecastPayload {
  if (!isPlainObject(value) || !exactKeys(value, ["instrument", "referencePrice", "direction", "thresholdPercent", "horizonAt", ...(Object.hasOwn(value, "probability") ? ["probability"] : [])])) return false;
  const instrument = value.instrument;
  if (!isPlainObject(instrument) || !exactKeys(instrument, ["type", "symbol"]) || typeof instrument.type !== "string" || !Object.hasOwn(SYMBOLS, instrument.type) || typeof instrument.symbol !== "string" || !SYMBOLS[instrument.type as CapsuleInstrumentType].test(instrument.symbol)) return false;
  if (typeof value.referencePrice !== "number" || !Number.isFinite(value.referencePrice) || value.referencePrice <= 0 || value.referencePrice > 1e15) return false;
  if (value.direction !== "up" && value.direction !== "down") return false;
  if (typeof value.thresholdPercent !== "number" || !Number.isFinite(value.thresholdPercent) || value.thresholdPercent <= 0 || value.thresholdPercent > 100) return false;
  try { parseTimestamp(value.horizonAt, "Forecast horizon"); } catch { return false; }
  return !Object.hasOwn(value, "probability") || (typeof value.probability === "number" && Number.isFinite(value.probability) && value.probability >= 0 && value.probability <= 1);
}

function isOutcomePayload(value: unknown): value is CapsuleOutcomePayload {
  if (!isPlainObject(value) || !exactKeys(value, ["forecastEventId", "observedPrice", "observedAt", "sourceUrl", "sourceTimestamp", "reportedBy", "actualReturnPercent", "forecastMet", ...(Object.hasOwn(value, "brierScore") ? ["brierScore"] : [])])) return false;
  if (typeof value.forecastEventId !== "string" || !CAPSULE_EVENT_UUID.test(value.forecastEventId)) return false;
  if (typeof value.observedPrice !== "number" || !Number.isFinite(value.observedPrice) || value.observedPrice <= 0 || value.observedPrice > 1e15) return false;
  try { parseTimestamp(value.observedAt, "Observation time"); parseTimestamp(value.sourceTimestamp, "Source timestamp"); } catch { return false; }
  if (typeof value.sourceUrl !== "string" || value.sourceUrl.length > 2_048) return false;
  try { const url = new URL(value.sourceUrl); if (url.protocol !== "https:" || !url.hostname || url.username || url.password) return false; } catch { return false; }
  return value.reportedBy === "user"
    && typeof value.actualReturnPercent === "number" && Number.isFinite(value.actualReturnPercent)
    && typeof value.forecastMet === "boolean"
    && (!Object.hasOwn(value, "brierScore") || (typeof value.brierScore === "number" && Number.isFinite(value.brierScore) && value.brierScore >= 0 && value.brierScore <= 1));
}

export function verifyCapsuleEventChain(capsuleId: string, anchorHash: string, rows: CapsuleEventRow[]): CapsuleEvent[] | null {
  if (rows.length > MAX_CAPSULE_EVENTS || !/^[a-f0-9]{64}$/.test(anchorHash)) return null;
  const events: CapsuleEvent[] = [];
  let previousHash = anchorHash;
  const forecasts = new Set<string>();
  const outcomes = new Set<string>();
  for (let index = 0; index < rows.length; index += 1) {
    const event = mapCapsuleEvent(rows[index]);
    if (!event || event.capsuleId !== capsuleId || event.sequence !== index + 1 || event.previousHash !== previousHash || event.idempotencyKey === "" || !CAPSULE_EVENT_UUID.test(event.forecastEventId ?? event.id)) return null;
    if (event.type === "forecast") {
      if (event.forecastEventId !== null || !isForecastPayload(event.payload)) return null;
      forecasts.add(event.id);
    } else {
      if (!event.forecastEventId || !forecasts.has(event.forecastEventId) || outcomes.has(event.forecastEventId) || !isOutcomePayload(event.payload) || event.payload.forecastEventId !== event.forecastEventId) return null;
      const forecast = events.find(candidate => candidate.id === event.forecastEventId);
      if (!forecast || !isForecastPayload(forecast.payload) || Date.parse(event.payload.observedAt) < Date.parse(forecast.payload.horizonAt)) return null;
      const expected = buildCapsuleOutcomePayload(forecast, event.payload);
      if (Math.abs(expected.actualReturnPercent - event.payload.actualReturnPercent) > 1e-10 || expected.forecastMet !== event.payload.forecastMet || expected.brierScore !== event.payload.brierScore) return null;
      outcomes.add(event.forecastEventId);
    }
    const { integrityHash, ...unsigned } = event;
    const actual = Buffer.from(hashCapsuleEvent(unsigned), "hex");
    if (!/^[a-f0-9]{64}$/.test(integrityHash)) return null;
    const expected = Buffer.from(integrityHash, "hex");
    if (!timingSafeEqual(actual, expected)) return null;
    previousHash = integrityHash;
    events.push(event);
  }
  return events;
}

export function sameCapsuleEventInput(event: CapsuleEvent, input: CapsuleEventInput) {
  if (event.type !== input.type || event.forecastEventId !== input.forecastEventId) return false;
  if (input.type === "forecast") return canonicalJson(event.payload) === canonicalJson(input.payload);
  const payload = event.payload as CapsuleOutcomePayload;
  return payload.forecastEventId === input.payload.forecastEventId
    && payload.observedPrice === input.payload.observedPrice
    && payload.observedAt === input.payload.observedAt
    && payload.sourceUrl === input.payload.sourceUrl
    && payload.sourceTimestamp === input.payload.sourceTimestamp;
}
