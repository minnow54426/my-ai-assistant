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
