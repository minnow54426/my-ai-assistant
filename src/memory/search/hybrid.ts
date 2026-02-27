import { VectorSearch } from './vector';
import { KeywordSearch } from './keyword';
import { SearchResult } from '../types';

export interface HybridSearchOptions {
  vectorWeight: number;
  keywordWeight: number;
}

export class HybridSearch {
  constructor(
    private vectorSearch: VectorSearch,
    private keywordSearch: KeywordSearch
  ) {}

  async search(
    query: string,
    queryEmbedding: Float32Array,
    options: HybridSearchOptions
  ): Promise<SearchResult[]> {
    // Parallel execution
    const [vectorResults, keywordResults] = await Promise.all([
      this.vectorSearch.search(queryEmbedding, 20),
      this.keywordSearch.search(query, 20)
    ]);

    // Merge results
    return this.mergeResults(vectorResults, keywordResults, options);
  }

  private mergeResults(
    vector: SearchResult[],
    keyword: SearchResult[],
    options: HybridSearchOptions
  ): SearchResult[] {
    const scores = new Map<string, { vector: number; keyword: number; result: SearchResult }>();

    // Collect vector scores
    vector.forEach(r => {
      scores.set(r.chunkId, {
        vector: r.score,
        keyword: 0,
        result: r
      });
    });

    // Collect keyword scores
    keyword.forEach(r => {
      const existing = scores.get(r.chunkId);
      if (existing) {
        existing.keyword = r.score;
      } else {
        scores.set(r.chunkId, {
          vector: 0,
          keyword: r.score,
          result: r
        });
      }
    });

    // Combine using weights
    return Array.from(scores.values())
      .map(({ vector, keyword, result }) => ({
        ...result,
        score: options.vectorWeight * vector + options.keywordWeight * keyword
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }
}
