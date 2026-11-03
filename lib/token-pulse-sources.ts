import { filterPersistableResearchSources } from "./research-source-limits.js";

export type TokenPulseSourceLink = { url: string };

/** Keep links that fit the persisted research-source contract, without discarding other results. */
export function filterPersistableTokenPulseSources<T extends TokenPulseSourceLink>(items: T[]) {
  return filterPersistableResearchSources(items);
}
