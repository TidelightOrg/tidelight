import { createHash } from "node:crypto";
import type { FlowEvidencePoint, FlowSource, FlowStance } from "@/lib/agent-flow-policy";

export type EvidenceGraphSource = FlowSource & { snippet?: string | null };
export type EvidenceGraphAsset = {
  ticker: string;
  issuer: string;
  summary: string;
  stance: FlowStance;
  confidence: number;
  sources: EvidenceGraphSource[];
  evidenceBalance?: { supporting: FlowEvidencePoint[]; counter: FlowEvidencePoint[] };
  risks?: string[];
  nextCheck?: string;
  synthesisMode?: "model" | "source_only";
  confidenceCapped?: boolean;
  market?: {
    spotSymbol?: string | null;
    spotLastPrice?: number | null;
    spotProviderTimestamp?: number | null;
    perpSymbol?: string | null;
    perpLastPrice?: number | null;
    perpProviderTimestamp?: number | null;
  };
};

export type EvidenceGraphNode =
  | { id: string; type: "event"; question: string; asOf: string }
  | { id: string; type: "subject"; subjectType: "issuer" | "macro_topic"; ticker: string; name: string }
  | { id: string; type: "instrument"; symbol: string; marketType: "reality_tokenized_spot" | "us_stock_perpetual"; observedAt: string | null; lastPrice: number | null; availability: "observed" | "unavailable" }
  | { id: string; type: "source"; url: string; title: string; publisher: string; publishedAt: string | null; capturedAt: string; temporalStatus: "dated_by_snapshot" | "undated"; excerpt: string | null }
  | { id: string; type: "hypothesis"; ticker: string; stance: FlowStance; summary: string; reportedConfidence: number | null; confidenceOrigin: "model_reported" | "application_calibrated" | "application_fallback"; riskConsiderations: string[]; nextCheck: string | null }
  | { id: string; type: "claim"; ticker: string; polarity: "supporting" | "contrary"; text: string; citationStatus: "source_linked" | "undated_source_linked" | "no_temporally_valid_source"; sourceIds: string[] }
  | { id: string; type: "passage"; sourceId: string; text: string; capturedAt: string; excerptKind: "retrieved_excerpt"; exactQuoteVerified: false };

export type EvidenceGraphEdge = { id: string; from: string; to: string; relation: "about" | "exposes_to" | "cites" | "supports" | "challenges" | "derived_from" | "contains_passage" };
export type EvidenceGraph = { version: 1; asOf: string; nodes: EvidenceGraphNode[]; edges: EvidenceGraphEdge[] };

function stableId(kind: string, value: string) {
  return `${kind}:${createHash("sha256").update(value).digest("hex").slice(0, 24)}`;
}

/** Build a bounded, citation-addressable graph. Citation links establish provenance, not semantic truth. */
export function buildEvidenceGraph(input: { question: string; assets: EvidenceGraphAsset[]; asOf: string; synthesisMode: "model" | "source_only" }): EvidenceGraph {
  const asOfMs = Date.parse(input.asOf);
  if (!Number.isFinite(asOfMs)) throw new Error("evidence-graph-invalid-asof");
  const asOf = new Date(asOfMs).toISOString();
  const nodes = new Map<string, EvidenceGraphNode>();
  const edges = new Map<string, EvidenceGraphEdge>();
  const addNode = (node: EvidenceGraphNode) => nodes.set(node.id, node);
  const addEdge = (from: string, to: string, relation: EvidenceGraphEdge["relation"]) => {
    const id = stableId("edge", `${from}\n${relation}\n${to}`);
    edges.set(id, { id, from, to, relation });
  };
  const eventId = stableId("event", `${input.question}\n${asOf}`);
  addNode({ id: eventId, type: "event", question: input.question.slice(0, 2_000), asOf });

  for (const asset of input.assets.slice(0, 3)) {
    const ticker = asset.ticker.toUpperCase();
    const subjectType = ticker === "MACRO" ? "macro_topic" as const : "issuer" as const;
    const issuerId = stableId("subject", `${subjectType}\n${ticker}`);
    const hypothesisId = stableId("hypothesis", `${ticker}\n${asOf}\n${asset.stance}\n${asset.summary}`);
    addNode({ id: issuerId, type: "subject", subjectType, ticker, name: asset.issuer.slice(0, 120) });
    const synthesisMode = asset.synthesisMode ?? input.synthesisMode;
    addNode({ id: hypothesisId, type: "hypothesis", ticker, stance: asset.stance, summary: asset.summary.slice(0, 900), reportedConfidence: synthesisMode === "model" && Number.isFinite(asset.confidence) ? Math.max(0, Math.min(1, asset.confidence)) : null, confidenceOrigin: synthesisMode !== "model" ? "application_fallback" : asset.confidenceCapped ? "application_calibrated" : "model_reported", riskConsiderations: (asset.risks ?? []).slice(0, 8).map(risk => risk.slice(0, 250)), nextCheck: asset.nextCheck?.slice(0, 250) ?? null });
    addEdge(eventId, issuerId, "about");
    addEdge(hypothesisId, issuerId, "about");

    const instruments = [
      { symbol: asset.market?.spotSymbol, marketType: "reality_tokenized_spot" as const, timestamp: asset.market?.spotProviderTimestamp, price: asset.market?.spotLastPrice },
      { symbol: asset.market?.perpSymbol, marketType: "us_stock_perpetual" as const, timestamp: asset.market?.perpProviderTimestamp, price: asset.market?.perpLastPrice },
    ];
    for (const instrument of instruments) {
      if (!instrument.symbol) continue;
      const instrumentId = stableId("instrument", `${instrument.marketType}\n${instrument.symbol.toUpperCase()}`);
      const timestampIsValid = typeof instrument.timestamp === "number" && Number.isFinite(instrument.timestamp) && instrument.timestamp > 0 && instrument.timestamp <= asOfMs;
      addNode({ id: instrumentId, type: "instrument", symbol: instrument.symbol.slice(0, 32).toUpperCase(), marketType: instrument.marketType, observedAt: timestampIsValid ? new Date(instrument.timestamp!).toISOString() : null, lastPrice: timestampIsValid && typeof instrument.price === "number" && Number.isFinite(instrument.price) && instrument.price > 0 ? instrument.price : null, availability: timestampIsValid ? "observed" : "unavailable" });
      addEdge(issuerId, instrumentId, "exposes_to");
    }

    const sourceIdsByUrl = new Map<string, { sourceId: string; passageId: string | null }>();
    const citedUrls = new Set([...(asset.evidenceBalance?.supporting ?? []), ...(asset.evidenceBalance?.counter ?? [])].flatMap(point => point.citedUrls));
    const prioritizedSources = [...asset.sources].sort((left, right) => Number(citedUrls.has(right.url)) - Number(citedUrls.has(left.url)));
    for (const source of prioritizedSources.slice(0, 30)) {
      let parsed: URL;
      try { parsed = new URL(source.url); } catch { continue; }
      if (parsed.protocol !== "https:") continue;
      const publishedMs = source.publishedAt ? Date.parse(source.publishedAt) : NaN;
      // A future-dated source is omitted completely so a historical snapshot
      // cannot reveal even its existence or excerpt before the publication.
      if (Number.isFinite(publishedMs) && publishedMs > asOfMs) continue;
      const sourceId = stableId("source", parsed.toString());
      const temporalStatus = !Number.isFinite(publishedMs) ? "undated" as const : "dated_by_snapshot" as const;
      addNode({ id: sourceId, type: "source", url: parsed.toString(), title: source.title.slice(0, 300), publisher: source.publisher.slice(0, 120), publishedAt: Number.isFinite(publishedMs) ? new Date(publishedMs).toISOString() : null, capturedAt: asOf, temporalStatus, excerpt: null });
      const passageId = typeof source.snippet === "string" && source.snippet.trim() ? stableId("passage", `${sourceId}\n${source.snippet}`) : null;
      if (passageId) {
        addNode({ id: passageId, type: "passage", sourceId, text: source.snippet!.slice(0, 1_200), capturedAt: asOf, excerptKind: "retrieved_excerpt", exactQuoteVerified: false });
        addEdge(sourceId, passageId, "contains_passage");
      }
      sourceIdsByUrl.set(parsed.toString(), { sourceId, passageId });
      addEdge(issuerId, sourceId, "about");
    }

    for (const [polarity, points, relation] of [
      ["supporting", asset.evidenceBalance?.supporting ?? [], "supports"],
      ["contrary", asset.evidenceBalance?.counter ?? [], "challenges"],
    ] as const) {
      for (const point of points.slice(0, 16)) {
        const validSources = [...new Map(point.citedUrls.map(url => {
          try { const source = sourceIdsByUrl.get(new URL(url).toString()); return source ? [source.sourceId, source] as const : null; } catch { return null; }
        }).filter((item): item is readonly [string, { sourceId: string; passageId: string | null }] => Boolean(item)))].map(([, source]) => source).filter(source => {
          const node = nodes.get(source.sourceId);
          return node?.type === "source";
        });
        const validSourceIds = validSources.map(source => source.sourceId);
        const hasUndatedSource = validSources.some(source => nodes.get(source.sourceId)?.type === "source" && (nodes.get(source.sourceId) as Extract<EvidenceGraphNode, { type: "source" }>).temporalStatus === "undated");
        const claimId = stableId("claim", `${ticker}\n${asOf}\n${polarity}\n${point.text}`);
        const priorClaim = nodes.get(claimId);
        const mergedSourceIds = [...new Set([...(priorClaim?.type === "claim" ? priorClaim.sourceIds : []), ...validSourceIds])];
        const priorUndated = priorClaim?.type === "claim" && priorClaim.citationStatus === "undated_source_linked";
        addNode({ id: claimId, type: "claim", ticker, polarity, text: point.text.slice(0, 700), citationStatus: mergedSourceIds.length ? (hasUndatedSource || priorUndated ? "undated_source_linked" : "source_linked") : "no_temporally_valid_source", sourceIds: mergedSourceIds });
        addEdge(hypothesisId, claimId, relation);
        for (const source of validSources) addEdge(claimId, source.passageId ?? source.sourceId, "cites");
      }
    }
  }

  return { version: 1, asOf, nodes: [...nodes.values()], edges: [...edges.values()] };
}
