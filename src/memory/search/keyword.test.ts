import { KeywordSearch } from './keyword';
import { MemoryDatabase } from '../storage/database';
import { Chunk } from '../types';
import { unlinkSync } from 'fs';

const TEST_DB = '/tmp/test-keyword-search.db';

describe('KeywordSearch', () => {
  let db: MemoryDatabase;
  let search: KeywordSearch;

  beforeEach(() => {
    try { unlinkSync(TEST_DB); } catch {}
    db = new MemoryDatabase(TEST_DB);
    search = new KeywordSearch(db);
  });

  afterEach(() => {
    db.close();
    try { unlinkSync(TEST_DB); } catch {}
  });

  it('should find matching text', async () => {
    // Add file first
    await db.addFile({
      path: 'MEMORY.md',
      type: 'long-term',
      hash: 'abc123',
      mtime: 1234567890
    });

    const chunks: Chunk[] = [
      {
        id: '1',
        path: 'MEMORY.md',
        type: 'long-term',
        startLine: 1,
        endLine: 1,
        text: 'Python programming language',
        embedding: new Float32Array([0]),
        createdAt: Date.now()
      },
      {
        id: '2',
        path: 'MEMORY.md',
        type: 'long-term',
        startLine: 2,
        endLine: 2,
        text: 'JavaScript framework',
        embedding: new Float32Array([0]),
        createdAt: Date.now()
      }
    ];

    await db.addChunks(chunks);

    const results = await search.search('Python', 2);

    expect(results.length).toBe(1);
    expect(results[0].text).toContain('Python');
  });
});
