import { memorySearchTool, memoryGetTool } from './memory-tools';
import { MemorySystem } from '../memory/index';
import { MockEmbeddingProvider } from '../memory/embeddings/mock-provider';
import { rmSync, mkdirSync } from 'fs';
import { ToolRegistry } from './tools';

const TEST_DIR = '/tmp/test-memory-tools';

describe('Memory Tools', () => {
  let memory: MemorySystem;
  let tools: ToolRegistry;

  beforeEach(async () => {
    try { rmSync(TEST_DIR, { recursive: true }); } catch {}
    mkdirSync(TEST_DIR, { recursive: true });

    memory = new MemorySystem({
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

    await memory.initialize();
    await memory.add('Python is a programming language');
    await memory.sync();

    tools = new ToolRegistry();
    tools.register(memorySearchTool(memory));
    tools.register(memoryGetTool(memory));
  });

  afterEach(async () => {
    await memory.close();
    try { rmSync(TEST_DIR, { recursive: true }); } catch {}
  });

  it('should search memory', async () => {
    const result = await tools.execute('memory_search', { query: 'Python' }) as any;

    expect(result).toHaveProperty('results');
    expect(result.results.length).toBeGreaterThan(0);
  });

  it('should get memory file', async () => {
    const today = new Date().toISOString().split('T')[0];
    const result = await tools.execute('memory_get', { path: `memory/${today}.md` }) as any;

    expect(result).toHaveProperty('content');
    expect(result.content).toContain('Python');
  });
});
