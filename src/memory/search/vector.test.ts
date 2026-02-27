import { VectorSearch } from './vector';
import { MemoryDatabase } from '../storage/database';
import { Chunk } from '../types';
import { unlinkSync } from 'fs';

const TEST_DB = '/tmp/test-vector-search.db';

describe('VectorSearch', () => {
  let db: MemoryDatabase;
  let search: VectorSearch;

  beforeEach(() => {
    try { unlinkSync(TEST_DB); } catch {}
    db = new MemoryDatabase(TEST_DB);
    search = new VectorSearch(db);
  });

  afterEach(() => {
    db.close();
    try { unlinkSync(TEST_DB); } catch {}
  });

  it('should find similar vectors', async () => {
    // Add file first for foreign key constraint
    await db.addFile({
      path: 'MEMORY.md',
      type: 'long-term',
      hash: 'abc123',
      mtime: 1234567890
    });

    // Add test chunks
    const chunks: Chunk[] = [
      {
        id: '1',
        path: 'MEMORY.md',
        type: 'long-term',
        startLine: 1,
        endLine: 1,
        text: 'AI and machine learning',
        embedding: new Float32Array([1, 0, 0]),
        createdAt: Date.now()
      },
      {
        id: '2',
        path: 'MEMORY.md',
        type: 'long-term',
        startLine: 2,
        endLine: 2,
        text: 'Cooking recipes',
        embedding: new Float32Array([0, 1, 0]),
        createdAt: Date.now()
      }
    ];

    await db.addChunks(chunks);

    // Search for similar to [1, 0, 0]
    const query = new Float32Array([1, 0, 0]);
    const results = await search.search(query, 2);

    expect(results.length).toBe(2);
    expect(results[0].chunkId).toBe('1'); // Most similar
    expect(results[0].score).toBeCloseTo(1, 5);
  });
});
