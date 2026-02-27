import { MemoryDatabase } from '../storage/database';

export interface KeywordSearchResult {
  chunkId: string;
  path: string;
  startLine: number;
  endLine: number;
  text: string;
  score: number;
  type: 'long-term' | 'daily';
}

export class KeywordSearch {
  constructor(private db: MemoryDatabase) {}

  async search(query: string, limit: number): Promise<KeywordSearchResult[]> {
    const chunks = await this.db.getAllChunks();

    // Simple keyword matching (can be enhanced with BM25)
    const queryLower = query.toLowerCase();
    const results = chunks
      .map(chunk => ({
        chunkId: chunk.id,
        path: chunk.path,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        text: chunk.text,
        score: this.calculateScore(chunk.text, queryLower),
        type: chunk.type
      }))
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return results;
  }

  private calculateScore(text: string, query: string): number {
    const textLower = text.toLowerCase();
    const words = query.split(/\s+/);

    // Count matching words
    let matchCount = 0;
    for (const word of words) {
      if (textLower.includes(word)) {
        matchCount++;
      }
    }

    return matchCount / words.length;
  }
}
