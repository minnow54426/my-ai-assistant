import { applyTemporalDecay } from './temporal-decay';
import { SearchResult } from '../types';

describe('Temporal Decay', () => {
  it('should decay old daily memories', () => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    const results: any[] = [
      { chunkId: '1', path: 'memory/2025-02-27.md', startLine: 1, endLine: 1, text: 'Recent', score: 0.8, type: 'daily', createdAt: now },
      { chunkId: '2', path: 'memory/2025-01-27.md', startLine: 1, endLine: 1, text: 'Old', score: 0.8, type: 'daily', createdAt: now - (30 * day) }
    ];

    const decayed = applyTemporalDecay(results, { halfLifeDays: 30 });

    // Old chunk should have lower score
    expect(decayed[0].score).toBeGreaterThan(decayed[1].score);
  });

  it('should not decay long-term memories', () => {
    const now = Date.now();
    const results: any[] = [
      { chunkId: '1', path: 'MEMORY.md', startLine: 1, endLine: 1, text: 'Old fact', score: 0.8, type: 'long-term', createdAt: now }
    ];

    const decayed = applyTemporalDecay(results, { halfLifeDays: 30 });

    // Score should be unchanged
    expect(decayed[0].score).toBe(0.8);
  });
});
