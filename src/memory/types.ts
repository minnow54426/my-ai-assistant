// ============================================================================
// NEW MEMORY SYSTEM TYPES (OpenClaw-style semantic memory)
// ============================================================================

/**
 * EmbeddingProvider interface
 */
export interface EmbeddingProvider {
  embed(text: string): Promise<Float32Array>;
  embedBatch(texts: string[]): Promise<Float32Array[]>;
  getModel(): string;
  getDimensions(): number;
  isAvailable(): Promise<boolean>;
}

/**
 * Memory file metadata
 */
export interface MemoryFile {
  path: string;              // Relative path (e.g., "MEMORY.md" or "memory/2025-02-27.md")
  type: 'long-term' | 'daily';
  hash: string;              // SHA256 of content
  mtime: number;             // File modification time (unix timestamp)
}

/**
 * Text chunk with embedding
 */
export interface Chunk {
  id: string;                // UUID
  path: string;
  type: 'long-term' | 'daily';
  startLine: number;
  endLine: number;
  text: string;
  embedding: Float32Array;
  createdAt: number;         // Unix timestamp
}

/**
 * Search result
 */
export interface SearchResult {
  chunkId: string;
  path: string;
  startLine: number;
  endLine: number;
  text: string;
  score: number;             // 0-1
  type: 'long-term' | 'daily';
}

/**
 * Memory system configuration
 */
export interface MemorySystemConfig {
  workspaceDir: string;
  memoryDir?: string;                    // Default: 'memory'
  provider: 'openai' | 'configurable';
  apiKey: string;
  baseURL?: string;
  embeddingModel?: string;
  embeddingDimensions?: number;
  embeddingURL?: string;
  embeddings?: EmbeddingProvider;       // For testing
  search: {
    vectorWeight: number;                // Default: 0.7
    keywordWeight: number;               // Default: 0.3
    mmr?: {
      enabled: boolean;
      lambda: number;                    // Default: 0.7
    };
    temporalDecay?: {
      enabled: boolean;
      halfLifeDays: number;              // Default: 30
    };
  };
  sync: {
    onSearch: boolean;                   // Sync before each search
    watch: boolean;                      // Watch files for changes
  };
}
