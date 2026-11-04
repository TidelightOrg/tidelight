import { createHash } from "node:crypto";
import { hashCapsuleSnapshot, type JsonValue } from "./decision-capsules";
import type { CapsuleEvent } from "./decision-capsule-events";

export type CapsulePublicationSelection = {
  research: boolean;
  evidence: boolean;
  events: boolean;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype
    ? value as Record<string, unknown>
    : null;
}
function exactKeys(value: Record<string, unknown>, allowed: string[], required = allowed) {
  return Object.keys(value).every(key => allowed.includes(key)) && required.every(key => Object.hasOwn(value, key));
}

function safeHttps(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2_048) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname && !url.username && !url.password ? url.toString() : null;
  } catch { return null; }
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.length <= 32_000 ? value : null;
}

function nullableText(value: unknown): boolean { return value === null || typeof value === "string"; }
function validDateText(value: unknown): boolean { return typeof value === "string" && Number.isFinite(Date.parse(value)); }

function publicText(value: unknown, limit = 2_000): string | null {
  if (typeof value !== "string") return null;
  return value.slice(0, limit)
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi, "[private identifier omitted]")
    .replace(/https?:\/\/[^\s)\]}>,]+/gi, "[source link omitted]");
}

function publicResearchSummary(value: unknown): JsonValue {
  if (typeof value === "string") return publicText(value, 4_000) ?? "";
  const root = record(value);
  if (!root) return null;
  const summary: Record<string, JsonValue> = {};
  const synthesis = record(root.synthesis);
  if (synthesis && (synthesis.mode === "model" || synthesis.mode === "source_only")) {
    summary.synthesis = { mode: synthesis.mode, provider: publicText(synthesis.provider, 120) };
  }
  const coverage = record(root.researchCoverage);
  if (coverage) {
    const publicCoverage: Record<string, JsonValue> = {};
    for (const key of ["mode", "collectedAt"]) if (typeof coverage[key] === "string") publicCoverage[key] = publicText(coverage[key], 200) ?? "";
    for (const key of ["lookbackDays", "queriesPerTicker", "collectedItems", "publishers"]) if (typeof coverage[key] === "number" && Number.isFinite(coverage[key])) publicCoverage[key] = coverage[key] as number;
    if (Array.isArray(coverage.limitations)) publicCoverage.limitations = coverage.limitations.slice(0, 12).flatMap(item => { const safe = publicText(item, 500); return safe ? [safe] : []; });
    summary.researchCoverage = publicCoverage;
  }
  if (Array.isArray(root.assets)) {
    summary.assets = root.assets.slice(0, 20).flatMap(value => {
      const asset = record(value);
      if (!asset) return [];
      const safe: Record<string, JsonValue> = {};
      for (const key of ["ticker", "issuer"]) { const field = publicText(asset[key], 100); if (field) safe[key] = field; }
      const narrative = publicText(asset.summary, 4_000); if (narrative) safe.summary = narrative;
      if (["bullish", "bearish", "mixed", "unclear"].includes(String(asset.stance))) safe.stance = asset.stance as string;
      if (typeof asset.confidence === "number" && Number.isFinite(asset.confidence) && asset.confidence >= 0 && asset.confidence <= 1) safe.confidence = asset.confidence;
      if (Array.isArray(asset.risks)) safe.risks = asset.risks.slice(0, 8).flatMap(item => { const risk = publicText(item, 500); return risk ? [risk] : []; });
      const nextCheck = publicText(asset.nextCheck, 500); if (nextCheck) safe.nextCheck = nextCheck;
      return Object.keys(safe).length ? [safe] : [];
    });
  }
  return summary;
}

/** Builds a public allowlist projection; private owner, run, source and event-storage IDs are excluded. */
export function buildPublicCapsuleSnapshot(input: {
  originalSnapshot: unknown;
  capsuleIntegrityHash: string;
  events: CapsuleEvent[];
  selection: CapsulePublicationSelection;
}): Record<string, JsonValue> {
  const { originalSnapshot, capsuleIntegrityHash, events, selection } = input;
  if (!/^[a-f0-9]{64}$/.test(capsuleIntegrityHash) || ![selection.research, selection.evidence, selection.events].some(Boolean)) {
    throw new TypeError("Select at least one public section.");
  }
  const root = record(originalSnapshot);
  const research = record(root?.research);
  if (!root || !research) throw new TypeError("The private capsule snapshot is malformed.");

  const projection: Record<string, JsonValue> = {
    schemaVersion: 1,
    sourceCapsuleIntegrityHash: capsuleIntegrityHash,
    integrityScope: "disclosed_public_projection",
    sourceAuthenticity: "not_independently_verified",
  };
  if (selection.research) {
    projection.research = {
      question: text(research.question) ?? "",
      createdAt: text(research.createdAt) ?? "",
      completedAt: text(research.completedAt),
      model: text(research.model),
      summary: publicResearchSummary(research.summary),
    };
  }

  if (selection.evidence) {
    const sources = Array.isArray(root.sources) ? root.sources : [];
    const sourceById = new Map<string, Record<string, unknown>>();
    const publicSources = sources.flatMap(value => {
      const source = record(value);
      const url = safeHttps(source?.url);
      if (!source || typeof source.id !== "string" || !url) return [];
      sourceById.set(source.id, source);
      return [{
        url,
        title: text(source.title) ?? "",
        publisher: text(source.publisher),
        publishedAt: text(source.publishedAt),
        retrievedAt: text(source.retrievedAt),
        sourceType: text(source.sourceType),
        excerpt: text(source.excerpt),
      }];
    });
    const evidence = Array.isArray(root.evidence) ? root.evidence : [];
    const publicEvidence = evidence.flatMap(value => {
      const item = record(value);
      if (!item) return [];
      const source = typeof item.sourceId === "string" ? sourceById.get(item.sourceId) : null;
      return [{
        sourceUrl: safeHttps(source?.url),
        claim: text(item.claim) ?? "",
        supportingQuote: text(item.supportingQuote),
        stance: text(item.stance),
        confidence: typeof item.confidence === "number" && Number.isFinite(item.confidence) ? item.confidence : null,
        recordedAt: text(item.recordedAt),
        quoteMatchStatus: text(item.quoteMatchStatus),
        claimSupportStatus: text(item.claimSupportStatus),
      }];
    });
    projection.evidence = { sources: publicSources, claims: publicEvidence };
  }

  if (selection.events) {
    const publicBase = { ...projection };
    let previousHash = hashCapsuleSnapshot(publicBase);
    const sequenceById = new Map(events.map(event => [event.id, event.sequence]));
    projection.eventAnchorHash = previousHash;
    projection.events = events.map(event => {
      let forecastSequence: number | null = null;
      let payload: Record<string, JsonValue>;
      if (event.type === "outcome") {
        const raw = event.payload as Record<string, unknown>;
        const sequence = typeof raw.forecastEventId === "string" ? sequenceById.get(raw.forecastEventId) : undefined;
        if (!sequence) throw new TypeError("Public outcome references a missing forecast.");
        forecastSequence = sequence;
        const outcome = { ...raw };
        delete outcome.forecastEventId;
        payload = outcome as Record<string, JsonValue>;
      } else payload = event.payload as unknown as Record<string, JsonValue>;
      const unsigned = { sequence: event.sequence, type: event.type, forecastSequence, payload, previousHash, createdAt: event.createdAt };
      const integrityHash = hashCapsuleSnapshot(unsigned);
      previousHash = integrityHash;
      return { ...unsigned, integrityHash };
    });
  }
  if (!verifyPublicCapsuleSnapshot(projection)) throw new TypeError("The public capsule projection failed validation.");
  return projection;
}

/** Verifies the disclosed projection and its re-keyed public event chain without exposing storage IDs. */
export function verifyPublicCapsuleSnapshot(value: unknown): boolean {
  const snapshot = record(value);
  if (!snapshot || !exactKeys(snapshot, ["schemaVersion", "sourceCapsuleIntegrityHash", "integrityScope", "sourceAuthenticity", "research", "evidence", "eventAnchorHash", "events"], ["schemaVersion", "sourceCapsuleIntegrityHash", "integrityScope", "sourceAuthenticity"]) || snapshot.schemaVersion !== 1 || typeof snapshot.sourceCapsuleIntegrityHash !== "string" || !/^[a-f0-9]{64}$/.test(snapshot.sourceCapsuleIntegrityHash)
    || snapshot.integrityScope !== "disclosed_public_projection" || snapshot.sourceAuthenticity !== "not_independently_verified"
    || (!Object.hasOwn(snapshot, "research") && !Object.hasOwn(snapshot, "evidence") && !Object.hasOwn(snapshot, "events"))) return false;
  if (Object.hasOwn(snapshot, "research")) {
    const research = record(snapshot.research);
    if (!research || !exactKeys(research, ["question", "createdAt", "completedAt", "model", "summary"]) || typeof research.question !== "string" || research.question.length > 32_000 || !validDateText(research.createdAt)
      || (research.completedAt !== null && !validDateText(research.completedAt)) || !nullableText(research.model) || !isJsonValue(research.summary)) return false;
  }
  if (Object.hasOwn(snapshot, "evidence")) {
    const evidence = record(snapshot.evidence);
    if (!evidence || !exactKeys(evidence, ["sources", "claims"]) || !Array.isArray(evidence.sources) || !Array.isArray(evidence.claims)) return false;
    if (evidence.sources.some(value => {
      const source = record(value);
      return !source || !exactKeys(source, ["url", "title", "publisher", "publishedAt", "retrievedAt", "sourceType", "excerpt"])
        || safeHttps(source.url) !== source.url || typeof source.title !== "string" || source.title.length > 32_000
        || !nullableText(source.publisher) || !nullableText(source.sourceType) || !nullableText(source.excerpt)
        || (source.publishedAt !== null && !validDateText(source.publishedAt)) || (source.retrievedAt !== null && !validDateText(source.retrievedAt));
    })) return false;
    if (evidence.claims.some(value => {
      const claim = record(value);
      return !claim || !exactKeys(claim, ["sourceUrl", "claim", "supportingQuote", "stance", "confidence", "recordedAt", "quoteMatchStatus", "claimSupportStatus"])
        || (claim.sourceUrl !== null && safeHttps(claim.sourceUrl) !== claim.sourceUrl) || typeof claim.claim !== "string" || claim.claim.length > 32_000
        || !nullableText(claim.supportingQuote) || !nullableText(claim.stance) || !nullableText(claim.quoteMatchStatus) || !nullableText(claim.claimSupportStatus)
        || (claim.confidence !== null && (typeof claim.confidence !== "number" || !Number.isFinite(claim.confidence) || claim.confidence < 0 || claim.confidence > 1))
        || (claim.recordedAt !== null && !validDateText(claim.recordedAt));
    })) return false;
  }
  if (!Object.hasOwn(snapshot, "events")) return !Object.hasOwn(snapshot, "eventAnchorHash");
  if (!Array.isArray(snapshot.events) || typeof snapshot.eventAnchorHash !== "string") return false;
  const base: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(snapshot)) if (key !== "events" && key !== "eventAnchorHash") base[key] = item;
  let previousHash: string;
  try { previousHash = hashCapsuleSnapshot(base); } catch { return false; }
  if (previousHash !== snapshot.eventAnchorHash) return false;
  const forecasts = new Map<number, Record<string, unknown>>(); const outcomes = new Set<number>();
  for (let index = 0; index < snapshot.events.length; index += 1) {
    const event = record(snapshot.events[index]);
    if (!event || event.sequence !== index + 1 || !["forecast", "outcome"].includes(String(event.type)) || event.previousHash !== previousHash
      || typeof event.createdAt !== "string" || !Number.isFinite(Date.parse(event.createdAt)) || !record(event.payload)) return false;
    const payload = event.payload as Record<string, unknown>;
    if (event.type === "forecast") {
      const forecastKeys = ["instrument", "referencePrice", "direction", "thresholdPercent", "horizonAt", "probability", "referenceSourceUrl", "referenceSourceTimestamp", "referenceReportedBy"];
      const instrument = record(payload.instrument);
      if (!exactKeys(event, ["sequence", "type", "forecastSequence", "payload", "previousHash", "createdAt", "integrityHash"]) || !exactKeys(payload, forecastKeys, ["instrument", "referencePrice", "direction", "thresholdPercent", "horizonAt"])
        || !instrument || !exactKeys(instrument, ["type", "symbol"]) || event.forecastSequence !== null || Object.hasOwn(payload, "forecastEventId")
        || typeof instrument.type !== "string" || typeof instrument.symbol !== "string" || typeof payload.referencePrice !== "number" || !Number.isFinite(payload.referencePrice) || payload.referencePrice <= 0
        || (payload.direction !== "up" && payload.direction !== "down") || typeof payload.thresholdPercent !== "number" || !Number.isFinite(payload.thresholdPercent) || payload.thresholdPercent <= 0 || payload.thresholdPercent > 100
        || typeof payload.horizonAt !== "string" || !Number.isFinite(Date.parse(payload.horizonAt))) return false;
      if (Object.hasOwn(payload, "probability") && (typeof payload.probability !== "number" || !Number.isFinite(payload.probability) || payload.probability < 0 || payload.probability > 1)) return false;
      if (Object.hasOwn(payload, "referenceSourceUrl") !== Object.hasOwn(payload, "referenceSourceTimestamp")) return false;
      if (Object.hasOwn(payload, "referenceSourceUrl") && (safeHttps(payload.referenceSourceUrl) !== payload.referenceSourceUrl || typeof payload.referenceSourceTimestamp !== "string" || !Number.isFinite(Date.parse(payload.referenceSourceTimestamp)))) return false;
      if (Object.hasOwn(payload, "referenceReportedBy") && payload.referenceReportedBy !== "user") return false;
      if (Object.hasOwn(payload, "referenceSourceUrl") && payload.referenceReportedBy !== "user") return false;
      forecasts.set(event.sequence as number, payload);
    } else {
      const reference = event.forecastSequence;
      if (!exactKeys(event, ["sequence", "type", "forecastSequence", "payload", "previousHash", "createdAt", "integrityHash"]) || !exactKeys(payload, ["observedPrice", "observedAt", "sourceUrl", "sourceTimestamp", "reportedBy", "actualReturnPercent", "forecastMet", "brierScore"], ["observedPrice", "observedAt", "sourceUrl", "sourceTimestamp", "reportedBy", "actualReturnPercent", "forecastMet"])
        || !Number.isSafeInteger(reference) || !forecasts.has(reference as number) || outcomes.has(reference as number) || Object.hasOwn(payload, "forecastEventId")
        || typeof payload.observedPrice !== "number" || !Number.isFinite(payload.observedPrice) || payload.observedPrice <= 0 || typeof payload.observedAt !== "string" || !Number.isFinite(Date.parse(payload.observedAt))
        || safeHttps(payload.sourceUrl) !== payload.sourceUrl || typeof payload.sourceTimestamp !== "string" || !Number.isFinite(Date.parse(payload.sourceTimestamp))
        || payload.reportedBy !== "user" || !Number.isFinite(payload.actualReturnPercent) || typeof payload.forecastMet !== "boolean") return false;
      const forecast = forecasts.get(reference as number);
      if (!forecast || Date.parse(String(payload.observedAt)) < Date.parse(String(forecast.horizonAt))) return false;
      const actualReturnPercent = ((payload.observedPrice as number) / (forecast.referencePrice as number) - 1) * 100;
      const boundary = (forecast.referencePrice as number) * (forecast.direction === "up" ? 1 + (forecast.thresholdPercent as number) / 100 : 1 - (forecast.thresholdPercent as number) / 100);
      const tolerance = Number.EPSILON * Math.max(forecast.referencePrice as number, payload.observedPrice as number, Math.abs(boundary)) * 8;
      const forecastMet = forecast.direction === "up" ? (payload.observedPrice as number) + tolerance >= boundary : (payload.observedPrice as number) - tolerance <= boundary;
      if (Math.abs(actualReturnPercent - (payload.actualReturnPercent as number)) > 1e-10 || forecastMet !== payload.forecastMet) return false;
      const expectedBrier = typeof forecast.probability === "number" ? (forecast.probability - (forecastMet ? 1 : 0)) ** 2 : undefined;
      if (expectedBrier === undefined ? Object.hasOwn(payload, "brierScore") : payload.brierScore !== expectedBrier) return false;
      outcomes.add(reference as number);
    }
    const { integrityHash, ...unsigned } = event;
    if (typeof integrityHash !== "string" || !/^[a-f0-9]{64}$/.test(integrityHash)) return false;
    try { if (hashCapsuleSnapshot(unsigned) !== integrityHash) return false; } catch { return false; }
    previousHash = integrityHash;
  }
  return true;
}

export function capsulePublicationHash(snapshot: unknown): string { return hashCapsuleSnapshot(snapshot); }
export function hashPublicationToken(token: string): string { return createHash("sha256").update(token, "utf8").digest("hex"); }
export const MAX_PUBLIC_CAPSULE_BYTES = 240 * 1024;

function isJsonValue(value: unknown, depth = 0): value is JsonValue {
  if (depth > 32) return false;
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.length <= 20_000 && value.every(item => isJsonValue(item, depth + 1));
  const object = record(value);
  return !!object && Object.keys(object).length <= 20_000 && Object.values(object).every(item => isJsonValue(item, depth + 1));
}

