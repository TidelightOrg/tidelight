import { filterPersistableResearchSources } from "./research-source-limits.js";

export type TokenPulseSourceLink = { url: string };

export function filterPersistableTokenPulseSources<T extends TokenPulseSourceLink>(items: T[]) {
  return filterPersistableResearchSources(items);
}
