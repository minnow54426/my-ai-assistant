import { FileStore } from './file-store';
import { MemoryFile } from '../types';
import { rmSync, mkdirSync } from 'fs';
import { join } from 'path';

const TEST_DIR = '/tmp/test-memory-store';

describe('FileStore', () => {
  let store: FileStore;

  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    store = new FileStore(TEST_DIR);
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('should list memory files', async () => {
    // Create test files
    await store.writeFile('MEMORY.md', '# Long term memory\nContent here');
    await store.writeFile('memory/2025-02-27.md', '# Daily log\nNotes');

    const files = await store.listFiles();

    expect(files.length).toBeGreaterThanOrEqual(2);
    const longTerm = files.find(f => f.path === 'MEMORY.md');
    expect(longTerm?.type).toBe('long-term');
  });

  it('should read file content', async () => {
    await store.writeFile('MEMORY.md', 'Test content');

    const content = await store.readFile('MEMORY.md');

    expect(content).toBe('Test content');
  });

  it('should calculate file hash', async () => {
    await store.writeFile('MEMORY.md', 'Test content');

    const files = await store.listFiles();
    const file = files.find(f => f.path === 'MEMORY.md');

    expect(file?.hash).toBeDefined();
    expect(file?.hash.length).toBeGreaterThan(0);
  });
});
