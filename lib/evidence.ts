export type EvidenceClaim = {
  claim: string;
  quote: string;
  stance: "supports" | "contradicts" | "context";
  confidence: number;
  sourceUrl?: string;
  quote_match_status: "matched_to_captured_text";
  claim_support_status: "not_independently_verified";
  passage_span: { start_codepoint: number; end_codepoint: number };
};

export type QwenBrief = {
  answer_status: "source_matched_claims" | "insufficient_evidence";
  summary: string;
  upside: string;
  downside: string;
  catalysts: string[];
  what_would_change: string[];
  claims: EvidenceClaim[];
  citation_coverage: number;
};

type EvidenceSource = { url: string; excerpt: string };

function normalizeQuote(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizeWithOffsets(value: string) {
  const codepoints = Array.from(value);
  const sourceOffsets: number[] = [];
  let collapsed = "";
  let pendingSpace: number | null = null;
  for (let index = 0; index < codepoints.length; index += 1) {
    const character = codepoints[index];
    if (/\s/u.test(character)) {
      if (collapsed && pendingSpace === null) pendingSpace = index;
      continue;
    }
    if (pendingSpace !== null) {
      collapsed += " ";
      sourceOffsets.push(pendingSpace);
      pendingSpace = null;
    }
    collapsed += character;
    sourceOffsets.push(index);
  }

  const normalized = collapsed.toLowerCase();
  const offsets: number[] = [];
  let consumedCodeUnits = 0;
  let previousLowerLength = 0;
  for (const [index, character] of Array.from(collapsed).entries()) {
    consumedCodeUnits += character.length;
    const lowerLength = collapsed.slice(0, consumedCodeUnits).toLowerCase().length;
    for (let unit = previousLowerLength; unit < lowerLength; unit += 1) offsets.push(sourceOffsets[index]);
    previousLowerLength = lowerLength;
  }
  return { normalized, offsets };
}

function findPassageSpan(excerpt: string, quote: string) {
  const passage = normalizeWithOffsets(excerpt);
  const normalizedQuote = normalizeQuote(quote);
  const matchAt = passage.normalized.indexOf(normalizedQuote);
  if (matchAt < 0) return null;
  const start = passage.offsets[matchAt];
  const last = passage.offsets[matchAt + normalizedQuote.length - 1];
  return start === undefined || last === undefined ? null : { start_codepoint: start, end_codepoint: last + 1 };
}

/** Keep only claims whose meaningful quote is present in the exact supplied passage. */
export function validateBrief(value: unknown, sources: EvidenceSource[]): QwenBrief | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const stringField = (key: string, max: number) => typeof candidate[key] === "string" && candidate[key].trim().length > 0 && candidate[key].length <= max;
  if (!stringField("summary", 1800) || !stringField("upside", 600) || !stringField("downside", 600) || !Array.isArray(candidate.catalysts) || !Array.isArray(candidate.claims)) return null;

  const claims = candidate.claims.flatMap((item): EvidenceClaim[] => {
    if (!item || typeof item !== "object") return [];
    const claim = item as Record<string, unknown>;
    if (typeof claim.claim !== "string" || claim.claim.trim().length < 10 || claim.claim.length > 500) return [];
    if (typeof claim.quote !== "string" || claim.quote.trim().length < 24 || claim.quote.length > 600) return [];
    const quote = normalizeQuote(claim.quote);
    const sourceUrl = typeof claim.source_url === "string" && sources.some((source) => source.url === claim.source_url) ? claim.source_url : undefined;
    const matchingSource = sources.find((source) => normalizeQuote(source.excerpt).includes(quote));
    if (!matchingSource || (sourceUrl && matchingSource.url !== sourceUrl)) return [];
    const passageSpan = findPassageSpan(matchingSource.excerpt, claim.quote);
    if (!passageSpan) return [];
    if (!(claim.stance === "supports" || claim.stance === "contradicts" || claim.stance === "context")) return [];
    const confidence = typeof claim.confidence === "number" && Number.isFinite(claim.confidence) ? Math.min(1, Math.max(0, claim.confidence)) : 0.5;
    return [{ claim: claim.claim.trim(), quote: claim.quote.trim(), stance: claim.stance, confidence, sourceUrl: sourceUrl ?? matchingSource.url, quote_match_status: "matched_to_captured_text", claim_support_status: "not_independently_verified", passage_span: passageSpan }];
  }).slice(0, 8);
  if (!claims.length) {
    return {
      answer_status: "insufficient_evidence",
      summary: "The supplied passages did not yield a source-matched claim that answers this question.",
      upside: "Unknown from the supplied evidence.",
      downside: "Unknown from the supplied evidence.",
      catalysts: [],
      what_would_change: [
        "A relevant primary-source passage that addresses the question.",
        "Independent evidence that clarifies or challenges the relevant facts.",
      ],
      claims: [],
      citation_coverage: 0,
    };
  }

  const catalysts = candidate.catalysts.flatMap((item) => typeof item === "string" && item.trim() ? [item.trim().slice(0, 240)] : []).slice(0, 5);
  const whatWouldChange = Array.isArray(candidate.what_would_change)
    ? candidate.what_would_change.flatMap((item) => typeof item === "string" && item.trim() ? [item.trim().slice(0, 240)] : []).slice(0, 4)
    : [];
  return {
    answer_status: "source_matched_claims",
    summary: (candidate.summary as string).trim(),
    upside: (candidate.upside as string).trim(),
    downside: (candidate.downside as string).trim(),
    catalysts,
    what_would_change: whatWouldChange.length ? whatWouldChange : ["A newer primary-source update that changes the reported facts.", "Independent reporting or an official filing that challenges the current interpretation."],
    claims,
    citation_coverage: Math.round((claims.length / Math.max(candidate.claims.length, 1)) * 100),
  };
}
