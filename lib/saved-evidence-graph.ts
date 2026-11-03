export type SavedGraphRun = {
  id: string;
  question: string;
  created_at: string;
  completed_at: string | null;
  summary: unknown;
};

export type SavedGraphSource = {
  id: string;
  url: string;
  title: string;
  publisher: string | null;
  published_at: string | null;
  retrieved_at: string;
  source_type: string;
  excerpt: string | null;
  content_hash: string | null;
};

export const SAVED_GRAPH_INPUT_LIMITS = {
  sourceUrlCodeUnits: 4_096,
  sourceTitleCodeUnits: 300,
  sourcePublisherCodeUnits: 120,
  sourceExcerptCodeUnits: 6_000,
  sourceContentHashCodeUnits: 128,
  evidenceClaimCodeUnits: 2_000,
  evidenceQuoteCodeUnits: 600,
  passageCodeUnits: 6_000,
  summarySourceEntries: 500,
  totalTextCodeUnits: 2_000_000,
} as const;

export type SavedGraphEvidence = {
  id: string;
  source_id: string | null;
  claim: string;
  supporting_quote: string | null;
  stance: "supports" | "contradicts" | "context";
  confidence: number | null;
  created_at: string;
  quote_match_status: "not_recorded" | "matched_to_captured_text";
  claim_support_status: "not_independently_verified";
  passage_start_codepoint: number | null;
  passage_end_codepoint: number | null;
};

export type SavedEvidenceGraphNode =
  | { id: string; type: "event"; question: string; asOf: string }
  | { id: string; type: "subject"; ticker: string; issuer: string; realityPair: string | null }
  | { id: string; type: "source"; recordId: string; url: string; title: string; publisher: string; publishedAt: string | null; retrievedAt: string; sourceType: string; contentHash: string | null; temporalStatus: "dated_before_snapshot" | "date_only_before_snapshot" | "undated" }
  | { id: string; type: "claim"; recordId: string; text: string; stance: "supports" | "contradicts" | "context"; confidence: number | null; sourceId: string | null; citationStatus: "source_linked" | "undated_source_linked" | "source_unavailable"; quoteMatchStatus: "matched_to_captured_text" | "recorded_match_not_reproduced" | "not_recorded"; claimSupportStatus: "not_independently_verified"; recordedAt: string }
  | { id: string; type: "passage"; recordId: string; sourceId: string; text: string; capturedAt: string; quoteMatchStatus: "matched_to_captured_text"; claimSupportStatus: "not_independently_verified" };

export type SavedEvidenceGraphEdge = {
  id: string;
  from: string;
  to: string;
  relation: "about" | "captured_for" | "cites" | "contains_passage" | "supports" | "challenges" | "contextualizes";
};

export type SavedEvidenceGraph = {
  version: 1;
  scope: "saved_research_run";
  runId: string;
  asOf: string;
  nodes: SavedEvidenceGraphNode[];
  edges: SavedEvidenceGraphEdge[];
  limitations: string[];
};

/**
 * Reject rows that exceed bounded storage and processing costs for one graph response.
 * Length checks use UTF-16 code units, which conservatively bounds JavaScript allocations.
 */
export function savedGraphInputsWithinLimits(sources: SavedGraphSource[], evidence: SavedGraphEvidence[]) {
  let totalTextCodeUnits = 0;
  for (const source of sources) {
    if (!source || typeof source.url !== "string" || typeof source.title !== "string" ||
        (source.publisher !== null && typeof source.publisher !== "string") ||
        (source.excerpt !== null && typeof source.excerpt !== "string") ||
        (source.content_hash !== null && typeof source.content_hash !== "string")) return false;
    if (source.url.length > SAVED_GRAPH_INPUT_LIMITS.sourceUrlCodeUnits ||
        source.title.length > SAVED_GRAPH_INPUT_LIMITS.sourceTitleCodeUnits ||
        (source.publisher?.length ?? 0) > SAVED_GRAPH_INPUT_LIMITS.sourcePublisherCodeUnits ||
        (source.content_hash?.length ?? 0) > SAVED_GRAPH_INPUT_LIMITS.sourceContentHashCodeUnits ||
        (source.excerpt?.length ?? 0) > SAVED_GRAPH_INPUT_LIMITS.sourceExcerptCodeUnits) return false;
    totalTextCodeUnits += source.url.length + source.title.length + (source.publisher?.length ?? 0) + (source.content_hash?.length ?? 0) + (source.excerpt?.length ?? 0);
    if (totalTextCodeUnits > SAVED_GRAPH_INPUT_LIMITS.totalTextCodeUnits) return false;
  }
  for (const item of evidence) {
    if (!item || typeof item.claim !== "string" ||
        (item.supporting_quote !== null && typeof item.supporting_quote !== "string")) return false;
    if (item.claim.length > SAVED_GRAPH_INPUT_LIMITS.evidenceClaimCodeUnits ||
        (item.supporting_quote?.length ?? 0) > SAVED_GRAPH_INPUT_LIMITS.evidenceQuoteCodeUnits) return false;
    totalTextCodeUnits += item.claim.length + (item.supporting_quote?.length ?? 0);
    if (totalTextCodeUnits > SAVED_GRAPH_INPUT_LIMITS.totalTextCodeUnits) return false;
  }
  return true;
}

/** Prefix stable node and edge identifiers with their graph kind. */
function stableId(kind: string, recordId: string) {
  return `${kind}:${recordId}`;
}

/** Parse a source or record timestamp without accepting invalid date strings. */
function validInstant(value: string | null | undefined): number | null {
  if (!value) return null;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const timestamp = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/i.exec(value);
  if (!dateOnly && !timestamp) return null;
  const [year, month, day] = (dateOnly ?? timestamp)!.slice(1, 4).map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth) return null;
  if (timestamp) {
    const [, , , , hour, minute, second] = timestamp;
    if (Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59) return null;
    const zone = timestamp[7];
    if (zone.toUpperCase() !== "Z" && (Number(zone.slice(1, 3)) > 23 || Number(zone.slice(4, 6)) > 59)) return null;
  }
  const normalizedValue = value.replace(/t/i, "T").replace(/z$/i, "Z");
  const parsed = Date.parse(normalizedValue);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Allow only credential-free HTTPS source links in the private graph response. */
function safeSourceUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Narrow untrusted saved JSON into a plain object. */
function stringRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

/** Reproduce a stored codepoint span from the captured source excerpt. */
function matchedPassage(evidence: SavedGraphEvidence, source: SavedGraphSource | undefined, excerptCodepoints: string[] | undefined): string | null {
  if (!source?.excerpt || !excerptCodepoints || evidence.quote_match_status !== "matched_to_captured_text" ||
      !Number.isInteger(evidence.passage_start_codepoint) || !Number.isInteger(evidence.passage_end_codepoint) ||
      evidence.passage_start_codepoint! < 0 || evidence.passage_end_codepoint! <= evidence.passage_start_codepoint!) return null;
  if (evidence.passage_end_codepoint! > excerptCodepoints.length) return null;
  const passage = excerptCodepoints.slice(evidence.passage_start_codepoint!, evidence.passage_end_codepoint!).join("");
  return passage && passage.length <= SAVED_GRAPH_INPUT_LIMITS.passageCodeUnits && evidence.supporting_quote && normalizeQuote(passage) === normalizeQuote(evidence.supporting_quote) ? passage : null;
}

/**
 * Build an inspectable graph from the normalized owner-scoped saved-brief rows.
 * Recorded citation and quote-match edges describe provenance only; they do not verify claim truth.
 */
export function buildSavedEvidenceGraph(input: { run: SavedGraphRun; sources: SavedGraphSource[]; evidence: SavedGraphEvidence[] }): SavedEvidenceGraph {
  if (!savedGraphInputsWithinLimits(input.sources, input.evidence)) throw new Error("saved-evidence-graph-input-too-large");
  const asOfMs = validInstant(input.run.completed_at);
  if (asOfMs === null) throw new Error("saved-evidence-graph-invalid-asof");
  const asOf = new Date(asOfMs).toISOString();
  const nodes = new Map<string, SavedEvidenceGraphNode>();
  const edges = new Map<string, SavedEvidenceGraphEdge>();
  let responseTextCodeUnits = input.run.id.length + "saved_research_run".length;
  const addText = (values: unknown[]) => {
    responseTextCodeUnits += values.reduce<number>((total, value) => total + (typeof value === "string" ? value.length : 0), 0);
    if (responseTextCodeUnits > SAVED_GRAPH_INPUT_LIMITS.totalTextCodeUnits) {
      throw new Error("saved-evidence-graph-response-too-large");
    }
  };
  const addNode = (node: SavedEvidenceGraphNode) => {
    addText(Object.values(node));
    nodes.set(node.id, node);
  };
  const addEdge = (from: string, to: string, relation: SavedEvidenceGraphEdge["relation"]) => {
    const id = stableId("edge", `${from}\n${relation}\n${to}`);
    addText([id, from, to, relation]);
    edges.set(id, { id, from, to, relation });
  };

  const eventId = stableId("event", input.run.id);
  addNode({ id: eventId, type: "event", question: input.run.question.slice(0, 2_000), asOf });

  const summary = stringRecord(input.run.summary);
  const exposures = Array.isArray(summary?.exposure) ? summary.exposure : [];
  const savedBriefSources = new Map<string, Record<string, unknown>>();
  if (Array.isArray(summary?.sources)) {
    for (const candidate of summary.sources.slice(0, SAVED_GRAPH_INPUT_LIMITS.summarySourceEntries)) {
      const savedSource = stringRecord(candidate);
      if (savedSource && typeof savedSource.url === "string") savedBriefSources.set(savedSource.url, savedSource);
    }
  }
  for (const candidate of exposures.slice(0, 12)) {
    const exposure = stringRecord(candidate);
    if (!exposure || typeof exposure.ticker !== "string" || typeof exposure.issuer !== "string") continue;
    const ticker = exposure.ticker.toUpperCase().slice(0, 16);
    if (!/^[A-Z0-9.]{1,16}$/.test(ticker)) continue;
    const subjectId = stableId("subject", ticker);
    addNode({ id: subjectId, type: "subject", ticker, issuer: exposure.issuer.slice(0, 120), realityPair: typeof exposure.realityPair === "string" ? exposure.realityPair.slice(0, 32) : null });
    addEdge(eventId, subjectId, "about");
  }

  const sourceByRecordId = new Map<string, SavedGraphSource>();
  const excerptCodepointsByRecordId = new Map<string, string[]>();
  const sourcePublicationByRecordId = new Map<string, string | null>();
  for (const source of input.sources) {
    const retrievedMs = validInstant(source.retrieved_at);
    const canonicalUrl = safeSourceUrl(source.url);
    if (!retrievedMs || retrievedMs > asOfMs || !canonicalUrl) continue;
    const briefSource = savedBriefSources.get(source.url);
    const summaryPublication = typeof briefSource?.publication_date === "string" ? briefSource.publication_date : null;
    const publicationValue = source.published_at ?? summaryPublication;
    const publishedMs = validInstant(publicationValue);
    const dateOnly = Boolean(publicationValue && /^\d{4}-\d{2}-\d{2}$/.test(publicationValue));
    if (publicationValue && (publishedMs === null || (dateOnly && new Date(publishedMs).toISOString().slice(0, 10) !== publicationValue))) continue;
    const snapshotDay = asOf.slice(0, 10);
    const publicationDay = publishedMs === null ? null : new Date(publishedMs).toISOString().slice(0, 10);
    // A date-only source from the snapshot day has no publish time, so it is withheld conservatively.
    if (publishedMs !== null && (publishedMs > asOfMs || (dateOnly && publicationDay! >= snapshotDay))) continue;
    const id = stableId("source", source.id);
    const temporalStatus = publishedMs === null ? "undated" as const : dateOnly ? "date_only_before_snapshot" as const : "dated_before_snapshot" as const;
    const node: SavedEvidenceGraphNode = {
      id, type: "source", recordId: source.id, url: canonicalUrl, title: source.title.slice(0, 300),
      publisher: (source.publisher ?? "").slice(0, 120), publishedAt: publishedMs === null ? null : new Date(publishedMs).toISOString(),
      retrievedAt: new Date(retrievedMs).toISOString(), sourceType: source.source_type.slice(0, 32),
      contentHash: source.content_hash, temporalStatus,
    };
    addNode(node);
    sourceByRecordId.set(source.id, source);
    if (source.excerpt) excerptCodepointsByRecordId.set(source.id, Array.from(source.excerpt));
    sourcePublicationByRecordId.set(source.id, publishedMs === null ? null : new Date(publishedMs).toISOString());
    addEdge(eventId, id, "captured_for");
  }

  for (const evidence of input.evidence) {
    const createdMs = validInstant(evidence.created_at);
    if (createdMs === null || createdMs > asOfMs) continue;
    const source = evidence.source_id ? sourceByRecordId.get(evidence.source_id) : undefined;
    if (evidence.source_id && input.sources.some((candidate) => candidate.id === evidence.source_id) && !source) continue;
    const sourceNodeId = source ? stableId("source", source.id) : null;
    const passage = matchedPassage(evidence, source, source ? excerptCodepointsByRecordId.get(source.id) : undefined);
    const id = stableId("claim", evidence.id);
    const validConfidence = typeof evidence.confidence === "number" && Number.isFinite(evidence.confidence) && evidence.confidence >= 0 && evidence.confidence <= 1 ? evidence.confidence : null;
    const quoteMatchStatus = evidence.quote_match_status !== "matched_to_captured_text"
      ? "not_recorded" as const
      : passage ? "matched_to_captured_text" as const : "recorded_match_not_reproduced" as const;
    const stance = evidence.stance;
    if (stance !== "supports" && stance !== "contradicts" && stance !== "context") continue;
    const node: SavedEvidenceGraphNode = {
      id, type: "claim", recordId: evidence.id, text: evidence.claim.slice(0, 2_000), stance,
      confidence: validConfidence, sourceId: sourceNodeId, citationStatus: source ? (sourcePublicationByRecordId.get(source.id) ? "source_linked" : "undated_source_linked") : "source_unavailable",
      quoteMatchStatus, claimSupportStatus: "not_independently_verified", recordedAt: new Date(createdMs).toISOString(),
    };
    addNode(node);
    addEdge(id, eventId, stance === "supports" ? "supports" : stance === "contradicts" ? "challenges" : "contextualizes");
    if (sourceNodeId) addEdge(id, sourceNodeId, "cites");
    if (source && passage && sourceNodeId) {
      const passageId = stableId("passage", evidence.id);
      addNode({ id: passageId, type: "passage", recordId: evidence.id, sourceId: sourceNodeId, text: passage, capturedAt: new Date(validInstant(source.retrieved_at)!).toISOString(), quoteMatchStatus: "matched_to_captured_text", claimSupportStatus: "not_independently_verified" });
      addEdge(sourceNodeId, passageId, "contains_passage");
      addEdge(id, passageId, "cites");
    }
  }

  const limitations = [
    "These links preserve saved research provenance; they do not independently verify claim truth or source reliability.",
    "A matched quote means text matched a captured excerpt; it does not establish that the claim is supported.",
    "Sources captured after the completed run, sources with future, invalid, or ambiguous publication dates, and date-only sources from the snapshot day are excluded with their cited claims to avoid future leakage.",
  ];
  addText([asOf, ...limitations]);
  return {
    version: 1,
    scope: "saved_research_run",
    runId: input.run.id,
    asOf,
    nodes: [...nodes.values()],
    edges: [...edges.values()],
    limitations,
  };
}
import { normalizeQuote } from "@/lib/evidence";
