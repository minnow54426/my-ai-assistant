/**
 * A single message in a conversation
 */
export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolCall?: ToolCall;
  toolResult?: unknown;
}

/**
 * Tool call representation (imported from agent)
 */
export interface ToolCall {
  name: string;
  params: Record<string, unknown>;
}

/**
 * A semantic summary of older messages
 */
export interface MemorySummary {
  summary: string;
  messageCount: number;
  createdAt: Date;
  coveredPeriod: {
    start: Date;
    end: Date;
  };
}

/**
 * The shared memory state
 */
export interface SharedMemory {
  recentMessages: ConversationMessage[];
  summaries: MemorySummary[];
  totalMessagesProcessed: number;
  lastUpdated: Date;
}

/**
 * Configuration for memory management
 */
export interface MemoryConfig {
  maxRecentMessages: number;      // Keep last N messages verbatim (default: 15)
  summarizeAfter: number;         // Summarize after N new messages (default: 20)
  maxSummaries: number;           // Keep maximum N summaries (default: 50)
  storagePath: string;            // Path to shared-memory.json
}

/**
 * Memory statistics
 */
export interface MemoryStats {
  totalMessages: number;
  recentCount: number;
  summaryCount: number;
  lastUpdated: Date;
}

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
 * Search response
 */
export interface SearchResponse {
  results: SearchResult[];
  query: string;
  provider: string;
  model: string;
  count: number;
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

/**
 * Search options (overrides config)
 */
export interface SearchOptions {
  vectorWeight?: number;
  keywordWeight?: number;
  mmr?: {
    enabled: boolean;
    lambda: number;
  };
  temporalDecay?: {
    enabled: boolean;
    halfLifeDays: number;
  };
}
