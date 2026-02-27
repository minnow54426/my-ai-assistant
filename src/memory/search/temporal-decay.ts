import { SearchResult } from '../types';

export interface TemporalDecayConfig {
  halfLifeDays: number;
}

export interface SearchResultWithAge extends SearchResult {
  createdAt: number;
}

export function applyTemporalDecay(
  results: SearchResultWithAge[],
  config: TemporalDecayConfig
): SearchResult[] {
  const now = Date.now();

  return results
    .map(r => {
      // Only apply to daily memories
      if (r.type === 'long-term') {
        return r;
      }

      const ageDays = (now - r.createdAt) / (1000 * 60 * 60 * 24);
      const decayFactor = Math.exp(-Math.LN2 * ageDays / config.halfLifeDays);

      return {
        ...r,
        score: r.score * decayFactor
      };
    })
    .sort((a, b) => b.score - a.score);
}
