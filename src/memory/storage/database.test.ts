import { MemoryDatabase } from './database';
import { Chunk, MemoryFile } from '../types';
import { unlinkSync, existsSync } from 'fs';

const TEST_DB = '/tmp/test-memory.db';

describe('MemoryDatabase', () => {
  let db: MemoryDatabase;

  beforeEach(() => {
    if (existsSync(TEST_DB)) {
      unlinkSync(TEST_DB);
    }
    db = new MemoryDatabase(TEST_DB);
  });

  afterEach(() => {
    db.close();
    if (existsSync(TEST_DB)) {
      unlinkSync(TEST_DB);
    }
  });

  it('should add and retrieve file', async () => {
    const file: MemoryFile = {
      path: 'MEMORY.md',
      type: 'long-term',
      hash: 'abc123',
      mtime: 1234567890
    };

    await db.addFile(file);
    const retrieved = await db.getFile('MEMORY.md');

    expect(retrieved).toBeDefined();
    expect(retrieved?.path).toBe('MEMORY.md');
    expect(retrieved?.type).toBe('long-term');
    expect(retrieved?.hash).toBe('abc123');
  });

  it('should add and retrieve chunks', async () => {
    // Add file first (foreign key constraint)
    const file: MemoryFile = {
      path: 'MEMORY.md',
      type: 'long-term',
      hash: 'abc123',
      mtime: 1234567890
    };
    await db.addFile(file);

    const chunk: Chunk = {
      id: 'uuid-123',
      path: 'MEMORY.md',
      type: 'long-term',
      startLine: 1,
      endLine: 10,
      text: 'Test content',
      embedding: new Float32Array([0.1, 0.2, 0.3]),
      createdAt: 1234567890
    };

    await db.addChunks([chunk]);
    const chunks = await db.getAllChunks();

    expect(chunks.length).toBe(1);
    expect(chunks[0].text).toBe('Test content');
  });
});
