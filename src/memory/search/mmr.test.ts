import { applyMMR } from './mmr';
import { SearchResult } from '../types';

describe('MMR Re-ranking', () => {
  it('should reduce redundant results', () => {
    const results: SearchResult[] = [
      { chunkId: '1', path: 'a', startLine: 1, endLine: 1, text: 'apple banana cherry', score: 0.9, type: 'long-term' },
      { chunkId: '2', path: 'b', startLine: 1, endLine: 1, text: 'apple banana date', score: 0.8, type: 'long-term' },
      { chunkId: '3', path: 'c', startLine: 1, endLine: 1, text: 'elephant fig grape', score: 0.7, type: 'long-term' }
    ];

    const reranked = applyMMR(results, { lambda: 0.7 });

    // Should prefer diverse results
    expect(reranked.length).toBe(3);
    // Result 3 should be ranked higher due to diversity
    expect(reranked.findIndex(r => r.chunkId === '3')).toBeLessThan(2);
  });
});
