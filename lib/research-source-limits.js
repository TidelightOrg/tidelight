export const MAX_RESEARCH_SOURCE_URL_CODE_UNITS = 4_096;
// Leave headroom for the UUID and tuple metadata in research_sources' composite B-tree index.
export const MAX_RESEARCH_SOURCE_URL_BYTES = 2_000;

/** @param {string} url */
export function isPersistableResearchSourceUrl(url) {
  return url.length <= MAX_RESEARCH_SOURCE_URL_CODE_UNITS && new TextEncoder().encode(url).byteLength <= MAX_RESEARCH_SOURCE_URL_BYTES;
}

/** @template {{ url: string }} T @param {T[]} items @returns {{ items: T[]; omittedOversizedLinks: number }} */
export function filterPersistableResearchSources(items) {
  const retained = [];
  let omittedOversizedLinks = 0;
  for (const item of items) {
    if (isPersistableResearchSourceUrl(item.url)) retained.push(item);
    else omittedOversizedLinks += 1;
  }
  return { items: retained, omittedOversizedLinks };
}
