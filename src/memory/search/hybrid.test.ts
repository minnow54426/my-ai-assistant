import { HybridSearch } from './hybrid';
import { VectorSearch } from './vector';
import { KeywordSearch } from './keyword';
import { SearchResult } from '../types';

describe('HybridSearch', () => {
  let vectorSearch: any;
  let keywordSearch: any;
  let hybridSearch: HybridSearch;

  beforeEach(() => {
    vectorSearch = {
      search: jest.fn()
    };

    keywordSearch = {
      search: jest.fn()
    };

    hybridSearch = new HybridSearch(vectorSearch, keywordSearch);
  });

  it('should merge vector and keyword results', async () => {
    const vectorResults: SearchResult[] = [
      { chunkId: '1', path: 'a', startLine: 1, endLine: 1, text: 'A', score: 0.9, type: 'long-term' },
      { chunkId: '2', path: 'b', startLine: 1, endLine: 1, text: 'B', score: 0.5, type: 'long-term' }
    ];

    const keywordResults: SearchResult[] = [
      { chunkId: '1', path: 'a', startLine: 1, endLine: 1, text: 'A', score: 0.3, type: 'long-term' },
      { chunkId: '3', path: 'c', startLine: 1, endLine: 1, text: 'C', score: 0.8, type: 'long-term' }
    ];

    vectorSearch.search.mockResolvedValue(vectorResults);
    keywordSearch.search.mockResolvedValue(keywordResults);

    const results = await hybridSearch.search('query', new Float32Array([1]), {
      vectorWeight: 0.7,
      keywordWeight: 0.3
    });

    // Chunk '1': 0.7 * 0.9 + 0.3 * 0.3 = 0.63 + 0.09 = 0.72
    // Chunk '2': 0.7 * 0.5 + 0.3 * 0 = 0.35
    // Chunk '3': 0.7 * 0 + 0.3 * 0.8 = 0.24

    expect(results.length).toBe(3);
    expect(results[0].chunkId).toBe('1');
    expect(results[0].score).toBeCloseTo(0.72, 2);
  });
});
