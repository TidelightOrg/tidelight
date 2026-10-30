import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

test("normalized research evidence records quote status and exclusive Unicode passage spans", async () => {
  const [migration, actions] = await Promise.all([
    readFile(new URL("supabase/migrations/20261030072558_persist_research_evidence_provenance.sql", root), "utf8"),
    readFile(new URL("app/actions.ts", root), "utf8"),
  ]);

  assert.match(migration, /quote_match_status text not null default 'not_recorded'/);
  assert.match(migration, /claim_support_status text not null default 'not_independently_verified'/);
  assert.match(migration, /passage_start_codepoint integer/);
  assert.match(migration, /passage_end_codepoint integer/);
  assert.match(migration, /passage_end_codepoint > passage_start_codepoint/);
  assert.match(migration, /quote_match_status = 'not_recorded'[\s\S]*passage_start_codepoint is null[\s\S]*passage_end_codepoint is null/);
  assert.match(actions, /quote_match_status: claim\.quote_match_status/);
  assert.match(actions, /claim_support_status: claim\.claim_support_status/);
  assert.match(actions, /passage_start_codepoint: claim\.passage_span\.start_codepoint/);
  assert.match(actions, /passage_end_codepoint: claim\.passage_span\.end_codepoint/);
});
