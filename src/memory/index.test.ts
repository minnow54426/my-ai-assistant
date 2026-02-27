import { MemorySystem } from './index';
import { MockEmbeddingProvider } from './embeddings/mock-provider';
import { rmSync, mkdirSync } from 'fs';

const TEST_DIR = '/tmp/test-memory-system';

describe('MemorySystem', () => {
  let system: MemorySystem;

  beforeEach(() => {
    try { rmSync(TEST_DIR, { recursive: true }); } catch {}
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    if (system) {
      await system.close();
    }
    try { rmSync(TEST_DIR, { recursive: true }); } catch {}
  });

  it('should initialize and create directories', async () => {
    system = new MemorySystem({
      workspaceDir: TEST_DIR,
      provider: 'openai',
      apiKey: 'test-key',
      embeddings: new MockEmbeddingProvider(),
      search: {
        vectorWeight: 0.7,
        keywordWeight: 0.3
      },
      sync: {
        onSearch: false,
        watch: false
      }
    });

    await system.initialize();

    // Check directories created
    const fs = require('fs');
    expect(fs.existsSync(TEST_DIR)).toBe(true);
    expect(fs.existsSync(`${TEST_DIR}/memory.db`)).toBe(true);
  });

  it('should add content to memory', async () => {
    system = new MemorySystem({
      workspaceDir: TEST_DIR,
      provider: 'openai',
      apiKey: 'test-key',
      embeddings: new MockEmbeddingProvider(),
      search: {
        vectorWeight: 0.7,
        keywordWeight: 0.3
      },
      sync: {
        onSearch: false,
        watch: false
      }
    });

    await system.initialize();
    await system.add('Test memory content');

    const today = new Date().toISOString().split('T')[0];
    const content = await system.get(`memory/${today}.md`);
    expect(content).toContain('Test memory content');
  });
});
