import { createHash, timingSafeEqual } from "node:crypto";

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

/** Canonical JSON for durable integrity checks: object keys sort recursively; array order is retained. */
export function canonicalJson(value: unknown): string {
  const visit = (item: unknown): string => {
    if (item === null) return "null";
    if (typeof item === "string" || typeof item === "boolean") return JSON.stringify(item);
    if (typeof item === "number") {
      if (!Number.isFinite(item)) throw new TypeError("Capsule snapshots must contain finite numbers.");
      return JSON.stringify(item);
    }
    if (Array.isArray(item)) return `[${item.map(visit).join(",")}]`;
    if (typeof item === "object" && Object.getPrototypeOf(item) === Object.prototype) {
      const record = item as Record<string, unknown>;
      return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${visit(record[key])}`).join(",")}}`;
    }
    throw new TypeError("Capsule snapshots must contain JSON values only.");
  };
  return visit(value);
}

export function hashCapsuleSnapshot(snapshot: unknown): string {
  return createHash("sha256").update(canonicalJson(snapshot), "utf8").digest("hex");
}

export function capsuleHashMatches(snapshot: unknown, expected: string): boolean {
  if (!/^[a-f0-9]{64}$/.test(expected)) return false;
  const actual = Buffer.from(hashCapsuleSnapshot(snapshot), "hex");
  const wanted = Buffer.from(expected, "hex");
  return actual.length === wanted.length && timingSafeEqual(actual, wanted);
}

export type CapsuleRun = {
  id: string;
  question: string;
  status: string;
  summary: unknown;
  created_at: string;
  completed_at: string | null;
  model_name: string | null;
};

export type CapsuleSource = {
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

export type CapsuleEvidence = {
  source_id: string | null;
  claim: string;
  supporting_quote: string | null;
  stance: string;
  confidence: number | null;
  created_at: string;
  quote_match_status: string;
  claim_support_status: string;
  passage_start_codepoint: number | null;
  passage_end_codepoint: number | null;
};

/** Snapshot saved inputs as observed; does not add predictions, outcomes, or inferred facts. */
export function buildOriginalCapsuleSnapshot(run: CapsuleRun, sources: CapsuleSource[], evidence: CapsuleEvidence[]) {
  return {
    schemaVersion: 1,
    capturedAt: new Date().toISOString(),
    origin: { type: "research_run", id: run.id },
    research: {
      question: run.question,
      status: run.status,
      createdAt: run.created_at,
      completedAt: run.completed_at,
      model: run.model_name,
      summary: run.summary,
    },
    sources: sources.map(source => ({
      id: source.id,
      url: source.url,
      title: source.title,
      publisher: source.publisher,
      publishedAt: source.published_at,
      retrievedAt: source.retrieved_at,
      sourceType: source.source_type,
      excerpt: source.excerpt,
      contentHash: source.content_hash,
    })),
    evidence: evidence.map(item => ({
      sourceId: item.source_id,
      claim: item.claim,
      supportingQuote: item.supporting_quote,
      stance: item.stance,
      confidence: item.confidence,
      recordedAt: item.created_at,
      quoteMatchStatus: item.quote_match_status,
      claimSupportStatus: item.claim_support_status,
      passageStartCodepoint: item.passage_start_codepoint,
      passageEndCodepoint: item.passage_end_codepoint,
    })),
  };
}

export const MAX_CAPSULE_SNAPSHOT_BYTES = 240 * 1024;

export function capsuleSnapshotSize(snapshot: unknown): number {
  return Buffer.byteLength(canonicalJson(snapshot), "utf8");
}
