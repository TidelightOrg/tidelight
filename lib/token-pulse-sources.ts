export const MAX_RESEARCH_SOURCE_URL_LENGTH = 4_096;

export type TokenPulseSourceLink = { url: string };

/** Keep links that fit the persisted research-source contract, without discarding other results. */
export function filterPersistableTokenPulseSources<T extends TokenPulseSourceLink>(items: T[]) {
  const retained: T[] = [];
  let omittedOversizedLinks = 0;
  for (const item of items) {
    if (item.url.length > MAX_RESEARCH_SOURCE_URL_LENGTH) omittedOversizedLinks += 1;
    else retained.push(item);
  }
  return { items: retained, omittedOversizedLinks };
}
