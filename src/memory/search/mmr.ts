import { SearchResult } from '../types';

export interface MMRConfig {
  lambda: number;  // 0-1, balance relevance vs diversity
}

export function applyMMR(results: SearchResult[], config: MMRConfig): SearchResult[] {
  const selected: SearchResult[] = [];
  const remaining = [...results];

  while (remaining.length > 0 && selected.length < 10) {
    let bestIdx = 0;
    let bestScore = -Infinity;

    // Calculate MMR score for each remaining result
    for (let i = 0; i < remaining.length; i++) {
      const result = remaining[i];
      const relevance = result.score;

      let maxSimilarity = 0;
      if (selected.length > 0) {
        maxSimilarity = Math.max(
          ...selected.map(s => similarity(result.text, s.text))
        );
      }

      const mmrScore = config.lambda * relevance - (1 - config.lambda) * maxSimilarity;

      if (mmrScore > bestScore) {
        bestScore = mmrScore;
        bestIdx = i;
      }
    }

    // Pick best result
    const chosen = remaining.splice(bestIdx, 1)[0];
    selected.push(chosen);
  }

  return selected;
}

function similarity(text1: string, text2: string): number {
  const tokens1 = new Set(text1.toLowerCase().split(/\s+/));
  const tokens2 = new Set(text2.toLowerCase().split(/\s+/));

  const intersection = new Set([...tokens1].filter(t => tokens2.has(t)));
  const union = new Set([...tokens1, ...tokens2]);

  return union.size === 0 ? 0 : intersection.size / union.size;
}
