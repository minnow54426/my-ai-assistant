import { MemoryFile, Chunk, SearchResult, MemorySystemConfig } from './types';

describe('Memory Types', () => {
  it('should define MemoryFile interface', () => {
    const file: MemoryFile = {
      path: 'MEMORY.md',
      type: 'long-term',
      hash: 'abc123',
      mtime: 1234567890
    };
    expect(file.path).toBe('MEMORY.md');
    expect(file.type).toBe('long-term');
  });

  it('should define Chunk interface', () => {
    const chunk: Chunk = {
      id: 'uuid-123',
      path: 'MEMORY.md',
      type: 'long-term',
      startLine: 1,
      endLine: 10,
      text: 'Sample text',
      embedding: new Float32Array([0.1, 0.2]),
      createdAt: 1234567890
    };
    expect(chunk.text).toBe('Sample text');
    expect(chunk.embedding).toBeInstanceOf(Float32Array);
  });

  it('should define SearchResult interface', () => {
    const result: SearchResult = {
      chunkId: 'uuid-123',
      path: 'MEMORY.md',
      startLine: 1,
      endLine: 10,
      text: 'Sample text',
      score: 0.95,
      type: 'long-term'
    };
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it('should validate default config', () => {
    const config: MemorySystemConfig = {
      workspaceDir: '/test/workspace',
      provider: 'openai',
      apiKey: 'test-key',
      search: {
        vectorWeight: 0.7,
        keywordWeight: 0.3
      },
      sync: {
        onSearch: true,
        watch: false
      }
    };
    expect(config.search.vectorWeight).toBe(0.7);
    expect(config.sync.onSearch).toBe(true);
  });
});
