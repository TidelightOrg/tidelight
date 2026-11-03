export const MAX_RESEARCH_SOURCE_URL_LENGTH = 4_096;
// research_sources has a composite B-tree unique index on (research_run_id, url).
// Keep each URL below PostgreSQL's ~2.7 KiB tuple limit on an 8 KiB page.
export const MAX_RESEARCH_SOURCE_URL_BYTES = 2_000;

export type TokenPulseSourceLink = { url: string };

/** Keep links that fit the persisted research-source contract, without discarding other results. */
export function filterPersistableTokenPulseSources<T extends TokenPulseSourceLink>(items: T[]) {
  const retained: T[] = [];
  let omittedOversizedLinks = 0;
  for (const item of items) {
    if (item.url.length > MAX_RESEARCH_SOURCE_URL_LENGTH || new TextEncoder().encode(item.url).byteLength > MAX_RESEARCH_SOURCE_URL_BYTES) omittedOversizedLinks += 1;
    else retained.push(item);
  }
  return { items: retained, omittedOversizedLinks };
}
