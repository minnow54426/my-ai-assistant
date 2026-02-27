import { MemoryDatabase } from '../storage/database';
import { Chunk } from '../types';

export interface VectorSearchResult {
  chunkId: string;
  path: string;
  startLine: number;
  endLine: number;
  text: string;
  score: number;
  type: 'long-term' | 'daily';
}

export class VectorSearch {
  constructor(private db: MemoryDatabase) {}

  async search(query: Float32Array, limit: number): Promise<VectorSearchResult[]> {
    const chunks = await this.db.getAllChunks();

    const results = chunks.map(chunk => ({
      chunkId: chunk.id,
      path: chunk.path,
      startLine: chunk.startLine,
      endLine: chunk.endLine,
      text: chunk.text,
      score: cosineSimilarity(query, chunk.embedding),
      type: chunk.type
    }));

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}
