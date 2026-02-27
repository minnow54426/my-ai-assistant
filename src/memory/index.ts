import { MemorySystemConfig, SearchResult, Chunk } from './types';
import { FileStore } from './storage/file-store';
import { MemoryDatabase } from './storage/database';
import { TextChunker } from './chunking/chunker';
import { HybridSearch } from './search/hybrid';
import { VectorSearch } from './search/vector';
import { KeywordSearch } from './search/keyword';
import { EmbeddingProvider } from './embeddings/provider';

// Simple UUID generator
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export class MemorySystem {
  private config: MemorySystemConfig;
  private db: MemoryDatabase;
  private fileStore: FileStore;
  private embeddings: EmbeddingProvider;
  private hybridSearch: HybridSearch;
  private chunker: TextChunker;

  constructor(config: MemorySystemConfig & { embeddings: EmbeddingProvider }) {
    this.config = config;
    this.db = new MemoryDatabase(`${config.workspaceDir}/memory.db`);
    this.fileStore = new FileStore(config.workspaceDir);
    this.embeddings = config.embeddings;
    this.chunker = new TextChunker({ chunkSize: 400, overlap: 80 });

    const vectorSearch = new VectorSearch(this.db);
    const keywordSearch = new KeywordSearch(this.db);
    this.hybridSearch = new HybridSearch(vectorSearch, keywordSearch);
  }

  async initialize(): Promise<void> {
    await this.fileStore.ensureDirectories();
  }

  async sync(): Promise<void> {
    const files = await this.fileStore.listFiles();

    for (const file of files) {
      const existing = await this.db.getFile(file.path);

      if (existing && existing.hash === file.hash) {
        continue; // Skip unchanged files
      }

      if (existing) {
        await this.db.clearPath(file.path);
      }

      await this.indexFile(file);
    }
  }

  async search(query: string): Promise<SearchResult[]> {
    if (this.config.sync.onSearch) {
      await this.sync();
    }

    const queryEmbedding = await this.embeddings.embed(query);

    return this.hybridSearch.search(query, queryEmbedding, {
      vectorWeight: this.config.search.vectorWeight,
      keywordWeight: this.config.search.keywordWeight
    });
  }

  async get(path: string): Promise<string> {
    return this.fileStore.readFile(path);
  }

  async add(content: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const path = `memory/${today}.md`;

    let existing = '';
    try {
      existing = await this.fileStore.readFile(path);
    } catch {}

    const updated = existing + (existing ? '\n\n' : '') + content;
    await this.fileStore.writeFile(path, updated);
  }

  async close(): Promise<void> {
    this.db.close();
  }

  private async indexFile(file: { path: string; type: 'long-term' | 'daily'; hash: string; mtime: number }): Promise<void> {
    const content = await this.fileStore.readFile(file.path);
    const chunks = this.chunker.chunk(content);

    const texts = chunks.map(c => c.text);
    const embeddings = await this.embeddings.embedBatch(texts);

    const records: Chunk[] = chunks.map((chunk, i) => ({
      id: generateId(),
      path: file.path,
      type: file.type,
      startLine: chunk.startLine,
      endLine: chunk.endLine,
      text: chunk.text,
      embedding: embeddings[i],
      createdAt: Date.now()
    }));

    await this.db.addChunks(records);
    await this.db.addFile(file);
  }
}
