# Phase 4: Conversation & Memory - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Add shared memory system with automatic semantic summarization that all CLI sessions can access and contribute to.

**Architecture:** MemoryManager sits between CLI and AgentExecutor, storing all messages in shared memory, automatically summarizing old messages every 20 messages, persisting to JSON file.

**Tech Stack:** TypeScript, Node.js (fs, path), Jest, existing GLM client

---

## Pre-Tasks: Setup

### Task 0: Create Memory Directory Structure

**Files:**
- Create: `src/memory/`
- Create: `data/` (for storage)

**Step 1: Create memory directory**

```bash
mkdir -p src/memory
```

Run: `ls -la src/memory`
Expected: Directory exists (empty)

**Step 2: Create data directory**

```bash
mkdir -p data
```

Run: `ls -la data`
Expected: Directory exists (empty)

**Step 3: Create .gitignore entry for data directory**

```bash
echo "data/" >> .gitignore
```

Run: `tail -1 .gitignore`
Expected: `data/`

**Step 4: Commit**

```bash
git add .gitignore
git commit -m "phase4: create directory structure for memory system"
```

---

## Task 1: Define Memory Data Structures

**Files:**
- Create: `src/memory/types.ts`
- Test: `src/memory/types.test.ts` (optional - just TypeScript compilation test)

**Step 1: Write the types file**

```typescript
// src/memory/types.ts

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
```

**Step 2: Compile TypeScript to verify types**

```bash
npx tsc --noEmit
```

Expected: No errors (types are valid)

**Step 3: Commit**

```bash
git add src/memory/types.ts
git commit -m "phase4: add memory data structures and types"
```

---

## Task 2: Implement MemoryManager - Basic Operations

**Files:**
- Create: `src/memory/memory-manager.ts`
- Create: `src/memory/memory-manager.test.ts`

**Step 1: Write tests for basic operations**

```typescript
// src/memory/memory-manager.test.ts

import { MemoryManager } from './memory-manager';
import { MemoryConfig, ConversationMessage } from './types';
import { GLMClient } from '../llm/glm';

describe('MemoryManager', () => {
  let mockLLMClient: jest.Mocked<GLMClient>;
  let config: MemoryConfig;

  beforeEach(() => {
    // Mock GLM client
    mockLLMClient = {
      sendMessage: jest.fn().mockResolvedValue({ content: 'Test summary' })
    } as any;

    config = {
      storagePath: '/tmp/test-memory.json',
      maxRecentMessages: 15,
      summarizeAfter: 20,
      maxSummaries: 50
    };

    // Clean up test file
    if (require('fs').existsSync(config.storagePath)) {
      require('fs').unlinkSync(config.storagePath);
    }
  });

  describe('Constructor', () => {
    it('creates new memory if file does not exist', () => {
      const manager = new MemoryManager(config, mockLLMClient);
      const stats = manager.getStats();

      expect(stats.totalMessages).toBe(0);
      expect(stats.recentCount).toBe(0);
      expect(stats.summaryCount).toBe(0);
    });
  });

  describe('addMessage', () => {
    it('adds message to recent messages', async () => {
      const manager = new MemoryManager(config, mockLLMClient);
      const message: ConversationMessage = {
        role: 'user',
        content: 'Hello',
        timestamp: new Date()
      };

      await manager.addMessage(message);

      const stats = manager.getStats();
      expect(stats.recentCount).toBe(1);
      expect(stats.totalMessages).toBe(1);
    });

    it('saves memory to disk after adding message', async () => {
      const manager = new MemoryManager(config, mockLLMClient);
      const message: ConversationMessage = {
        role: 'user',
        content: 'Hello',
        timestamp: new Date()
      };

      await manager.addMessage(message);

      const fs = require('fs');
      expect(fs.existsSync(config.storagePath)).toBe(true);
    });

    it('increments total messages processed', async () => {
      const manager = new MemoryManager(config, mockLLMClient);
      const message: ConversationMessage = {
        role: 'user',
        content: 'Hello',
        timestamp: new Date()
      };

      await manager.addMessage(message);
      await manager.addMessage({ ...message, content: 'Hello again' });

      const stats = manager.getStats();
      expect(stats.totalMessages).toBe(2);
    });
  });

  describe('getContext', () => {
    it('returns empty context when no messages', () => {
      const manager = new MemoryManager(config, mockLLMClient);
      const context = manager.getContext();

      expect(context).toContain('Previous topics discussed');
      expect(context).toContain('(none)');
      expect(context).toContain('Recent conversation');
    });

    it('includes recent messages in context', async () => {
      const manager = new MemoryManager(config, mockLLMClient);
      await manager.addMessage({
        role: 'user',
        content: 'Test message',
        timestamp: new Date()
      });

      const context = manager.getContext();
      expect(context).toContain('Test message');
    });
  });

  describe('getStats', () => {
    it('returns accurate statistics', async () => {
      const manager = new MemoryManager(config, mockLLMClient);
      await manager.addMessage({
        role: 'user',
        content: 'Test',
        timestamp: new Date()
      });

      const stats = manager.getStats();

      expect(stats.totalMessages).toBe(1);
      expect(stats.recentCount).toBe(1);
      expect(stats.summaryCount).toBe(0);
      expect(stats.lastUpdated).toBeInstanceOf(Date);
    });
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm test src/memory/memory-manager.test.ts
```

Expected: FAIL with "MemoryManager not defined" or similar

**Step 3: Implement MemoryManager class**

```typescript
// src/memory/memory-manager.ts

import * as fs from 'fs';
import * as path from 'path';
import {
  MemoryConfig,
  SharedMemory,
  ConversationMessage,
  MemorySummary,
  MemoryStats
} from './types';
import { GLMClient } from '../llm/glm';

export class MemoryManager {
  private memory: SharedMemory;
  private config: MemoryConfig;
  private llmClient: GLMClient;

  constructor(config: MemoryConfig, llmClient: GLMClient) {
    this.config = config;
    this.llmClient = llmClient;
    this.memory = this.loadOrCreate();
  }

  /**
   * Add a new message to shared memory
   * Triggers summarization if needed
   */
  async addMessage(message: ConversationMessage): Promise<void> {
    this.memory.recentMessages.push(message);
    this.memory.totalMessagesProcessed++;
    this.memory.lastUpdated = new Date();

    // Check if we need to summarize
    if (this.memory.totalMessagesProcessed % this.config.summarizeAfter === 0) {
      if (this.memory.recentMessages.length > this.config.maxRecentMessages) {
        await this.summarizeOldMessages();
      }
    }

    await this.save();
  }

  /**
   * Get context for LLM (summaries + recent messages)
   */
  getContext(): string {
    const summariesText = this.memory.summaries
      .map(s => `- ${s.summary}`)
      .join('\n');

    const recentText = this.memory.recentMessages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    return `Previous topics discussed:\n${summariesText || '(none)'}\n\nRecent conversation:\n${recentText}`;
  }

  /**
   * Get memory statistics
   */
  getStats(): MemoryStats {
    return {
      totalMessages: this.memory.totalMessagesProcessed,
      recentCount: this.memory.recentMessages.length,
      summaryCount: this.memory.summaries.length,
      lastUpdated: this.memory.lastUpdated
    };
  }

  /**
   * Summarize oldest messages when we exceed the limit
   */
  private async summarizeOldMessages(): Promise<void> {
    const messagesToSummarize = this.memory.recentMessages.splice(0, 10);

    try {
      const summaryPrompt = this.buildSummaryPrompt(messagesToSummarize);
      const response = await this.llmClient.sendMessage(summaryPrompt);

      const newSummary: MemorySummary = {
        summary: response.content,
        messageCount: messagesToSummarize.length,
        createdAt: new Date(),
        coveredPeriod: {
          start: messagesToSummarize[0].timestamp,
          end: messagesToSummarize[messagesToSummarize.length - 1].timestamp
        }
      };

      this.memory.summaries.push(newSummary);

      // Prune old summaries if we have too many
      if (this.memory.summaries.length > this.config.maxSummaries) {
        this.memory.summaries.splice(
          0,
          this.memory.summaries.length - this.config.maxSummaries
        );
      }
    } catch (error) {
      console.error('Failed to summarize messages:', error);
      // Keep messages instead of losing them
      this.memory.recentMessages.unshift(...messagesToSummarize);
    }
  }

  /**
   * Build prompt to generate summary from messages
   */
  private buildSummaryPrompt(messages: ConversationMessage[]): string {
    const messagesText = messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    return `Summarize the following conversation messages into ONE concise sentence (max 30 words).

${messagesText}

Summary:`;
  }

  /**
   * Load memory from disk or create new
   */
  private loadOrCreate(): SharedMemory {
    try {
      if (fs.existsSync(this.config.storagePath)) {
        const data = fs.readFileSync(this.config.storagePath, 'utf-8');
        const parsed = JSON.parse(data);

        // Convert date strings back to Date objects
        return {
          recentMessages: parsed.recentMessages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          })),
          summaries: parsed.summaries.map((s: any) => ({
            ...s,
            createdAt: new Date(s.createdAt),
            coveredPeriod: {
              start: new Date(s.coveredPeriod.start),
              end: new Date(s.coveredPeriod.end)
            }
          })),
          totalMessagesProcessed: parsed.totalMessagesProcessed,
          lastUpdated: new Date(parsed.lastUpdated)
        };
      }
    } catch (error) {
      console.warn(`Failed to load memory from ${this.config.storagePath}, creating new`, error);
    }

    // Return empty memory state
    return {
      recentMessages: [],
      summaries: [],
      totalMessagesProcessed: 0,
      lastUpdated: new Date()
    };
  }

  /**
   * Save memory to disk
   */
  private async save(): Promise<void> {
    try {
      const dir = path.dirname(this.config.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(
        this.config.storagePath,
        JSON.stringify(this.memory, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('Failed to save memory:', error);
      // Don't throw - memory loss is better than crashing
    }
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test src/memory/memory-manager.test.ts
```

Expected: All basic tests pass (constructor, addMessage, getContext, getStats)

**Step 5: Commit**

```bash
git add src/memory/memory-manager.ts src/memory/memory-manager.test.ts
git commit -m "phase4: implement MemoryManager basic operations"
```

---

## Task 3: Implement MemoryManager - Summarization

**Files:**
- Modify: `src/memory/memory-manager.test.ts` (add summarization tests)

**Step 1: Write summarization tests**

```typescript
// Add to src/memory/memory-manager.test.ts

  describe('Summarization', () => {
    it('triggers summarization after 20 messages', async () => {
      const manager = new MemoryManager(config, mockLLMClient);

      // Add 20 messages
      for (let i = 0; i < 20; i++) {
        await manager.addMessage({
          role: 'user',
          content: `Message ${i}`,
          timestamp: new Date()
        });
      }

      const stats = manager.getStats();
      expect(stats.summaryCount).toBeGreaterThan(0);
      expect(stats.recentCount).toBeLessThanOrEqual(15);
    });

    it('summarizes oldest 10 messages', async () => {
      const manager = new MemoryManager(config, mockLLMClient);

      // Add 15 messages to fill recent messages
      for (let i = 0; i < 15; i++) {
        await manager.addMessage({
          role: 'user',
          content: `Message ${i}`,
          timestamp: new Date()
        });
      }

      // Add 5 more to trigger summarization (20 total)
      for (let i = 15; i < 20; i++) {
        await manager.addMessage({
          role: 'user',
          content: `Message ${i}`,
          timestamp: new Date()
        });
      }

      const stats = manager.getStats();
      expect(stats.summaryCount).toBe(1);
      expect(stats.recentCount).toBe(10); // 15 - 10 summarized + 5 new

      // Verify summary was created with correct message count
      const context = manager.getContext();
      expect(context).toContain('Test summary');
    });

    it('prunes summaries when exceeding maxSummaries', async () => {
      const smallConfig = { ...config, maxSummaries: 3 };
      const manager = new MemoryManager(smallConfig, mockLLMClient);

      // Add enough messages to create 4 summaries (20 * 4 = 80 messages)
      for (let i = 0; i < 80; i++) {
        await manager.addMessage({
          role: 'user',
          content: `Message ${i}`,
          timestamp: new Date()
        });
      }

      const stats = manager.getStats();
      expect(stats.summaryCount).toBe(3); // Pruned to maxSummaries
    });

    it('handles summarization failure gracefully', async () => {
      const failingClient = {
        sendMessage: jest.fn().mockRejectedValue(new Error('API error'))
      } as any;

      const manager = new MemoryManager(config, failingClient);

      // Add 20 messages to trigger summarization
      for (let i = 0; i < 20; i++) {
        await manager.addMessage({
          role: 'user',
          content: `Message ${i}`,
          timestamp: new Date()
        });
      }

      const stats = manager.getStats();
      // Messages should be kept, not lost
      expect(stats.recentCount).toBe(20);
    });
  });
```

**Step 2: Run tests to verify they pass**

```bash
npm test src/memory/memory-manager.test.ts --testNamePattern="Summarization"
```

Expected: All summarization tests pass (should already pass from Task 2 implementation)

**Step 3: Commit**

```bash
git add src/memory/memory-manager.test.ts
git commit -m "phase4: add comprehensive summarization tests"
```

---

## Task 4: Test MemoryManager Persistence

**Files:**
- Modify: `src/memory/memory-manager.test.ts` (add persistence tests)

**Step 1: Write persistence tests**

```typescript
// Add to src/memory/memory-manager.test.ts

  describe('Persistence', () => {
    it('saves memory to disk after each addMessage', async () => {
      const manager = new MemoryManager(config, mockLLMClient);
      const fs = require('fs');

      await manager.addMessage({
        role: 'user',
        content: 'Test message',
        timestamp: new Date()
      });

      expect(fs.existsSync(config.storagePath)).toBe(true);
    });

    it('loads existing memory from disk', async () => {
      const fs = require('fs');

      // Create first manager and add message
      const manager1 = new MemoryManager(config, mockLLMClient);
      await manager1.addMessage({
        role: 'user',
        content: 'Persistent message',
        timestamp: new Date('2026-02-26T10:00:00.000Z')
      });

      // Create second manager with same config
      const manager2 = new MemoryManager(config, mockLLMClient);
      const stats = manager2.getStats();

      expect(stats.totalMessages).toBe(1);
      expect(stats.recentCount).toBe(1);

      const context = manager2.getContext();
      expect(context).toContain('Persistent message');
    });

    it('handles corrupted file gracefully', async () => {
      const fs = require('fs');

      // Write invalid JSON
      fs.writeFileSync(config.storagePath, 'invalid json');

      const manager = new MemoryManager(config, mockLLMClient);
      const stats = manager.getStats();

      // Should create new empty memory
      expect(stats.totalMessages).toBe(0);
      expect(stats.recentCount).toBe(0);
    });

    it('preserves Date objects correctly', async () => {
      const manager = new MemoryManager(config, mockLLMClient);
      const testDate = new Date('2026-02-26T10:30:00.000Z');

      await manager.addMessage({
        role: 'user',
        content: 'Test',
        timestamp: testDate
      });

      // Create new manager to load from disk
      const manager2 = new MemoryManager(config, mockLLMClient);
      const context = manager2.getContext();

      expect(context).toContain('2026-02-26T10:30:00.000Z');
    });
  });
```

**Step 2: Run tests to verify they pass**

```bash
npm test src/memory/memory-manager.test.ts --testNamePattern="Persistence"
```

Expected: All persistence tests pass

**Step 3: Commit**

```bash
git add src/memory/memory-manager.test.ts
git commit -m "phase4: add persistence tests for MemoryManager"
```

---

## Task 5: Enhance AgentExecutor with Memory Support

**Files:**
- Modify: `src/agent/executor.ts`
- Create: `src/agent/executor-memory-integration.test.ts`

**Step 1: Modify AgentExecutor config**

```typescript
// Add to src/agent/executor.ts

import { ToolRegistry } from "./tools";
import { GLMClient } from "../llm/glm";
import { MemoryManager } from "../memory/memory-manager"; // NEW

/**
 * Configuration for AgentExecutor
 */
export interface AgentExecutorConfig {
  llmClient: GLMClient;
  tools: ToolRegistry;
  memoryManager?: MemoryManager; // NEW - optional for backward compatibility
}
```

**Step 2: Modify AgentExecutor class**

```typescript
// Modify src/agent/executor.ts

export class AgentExecutor {
  private llmClient: GLMClient;
  private tools: ToolRegistry;
  private memoryManager?: MemoryManager; // NEW

  constructor(config: AgentExecutorConfig) {
    this.llmClient = config.llmClient;
    this.tools = config.tools;
    this.memoryManager = config.memoryManager; // NEW
  }

  /**
   * Process a user message through the agent
   * Now uses shared memory if available
   */
  async processMessage(message: string): Promise<string> {
    // NEW: Add user message to shared memory
    if (this.memoryManager) {
      await this.memoryManager.addMessage({
        role: 'user',
        content: message,
        timestamp: new Date()
      });
    }

    // Step 1: Build system prompt with tool descriptions
    const systemPrompt = this.buildSystemPrompt();

    // NEW: Include shared memory context
    const memoryContext = this.memoryManager
      ? `\n\n${this.memoryManager.getContext()}\n\n`
      : '';

    // Step 2: Send to LLM with memory context
    const prompt = `${systemPrompt}${memoryContext}User: ${message}\nAssistant:`;
    const response = await this.llmClient.sendMessage(prompt);

    // Step 3: Check if LLM wants to use a tool
    const toolCall = this.parseToolCall(response.content);

    if (toolCall) {
      // Phase 2: Execute tool and get final response
      try {
        // Step 4: Execute the tool
        const toolResult = await this.tools.execute(toolCall.name, toolCall.params);

        // Step 5: Send result back to LLM for natural response
        const followUpPrompt = `You just used the ${toolCall.name} tool and got this result: ${JSON.stringify(toolResult)}

Please provide a helpful, natural response to the user's question using this information.
Do NOT mention using a tool or repeat the tool call format. Just answer naturally.

User's question: ${message}`;

        const finalResponse = await this.llmClient.sendMessage(followUpPrompt);

        // NEW: Add assistant response to shared memory
        if (this.memoryManager) {
          await this.memoryManager.addMessage({
            role: 'assistant',
            content: finalResponse.content,
            timestamp: new Date(),
            toolCall,
            toolResult
          });
        }

        return finalResponse.content;
      } catch (error) {
        // Handle tool execution errors gracefully
        const errorMsg = `Error executing tool ${toolCall.name}: ${error instanceof Error ? error.message : "Unknown error"}`;

        // NEW: Add error to memory
        if (this.memoryManager) {
          await this.memoryManager.addMessage({
            role: 'assistant',
            content: errorMsg,
            timestamp: new Date()
          });
        }

        return errorMsg;
      }
    }

    // No tool needed, return direct response
    // NEW: Add to memory
    if (this.memoryManager) {
      await this.memoryManager.addMessage({
        role: 'assistant',
        content: response.content,
        timestamp: new Date()
      });
    }

    return response.content;
  }

  // buildSystemPrompt() and parseToolCall() remain unchanged
}
```

**Step 3: Write integration tests**

```typescript
// src/agent/executor-memory-integration.test.ts

import { AgentExecutor } from './executor';
import { ToolRegistry } from './tools';
import { GLMClient } from '../llm/glm';
import { MemoryManager } from '../memory/memory-manager';
import { MemoryConfig } from '../memory/types';

describe('AgentExecutor with Memory Integration', () => {
  let mockLLMClient: jest.Mocked<GLMClient>;
  let toolRegistry: ToolRegistry;
  let memoryManager: MemoryManager;
  let memoryConfig: MemoryConfig;

  beforeEach(() => {
    mockLLMClient = {
      sendMessage: jest.fn()
    } as any;

    toolRegistry = new ToolRegistry();

    memoryConfig = {
      storagePath: '/tmp/test-executor-memory.json',
      maxRecentMessages: 15,
      summarizeAfter: 20,
      maxSummaries: 50
    };

    memoryManager = new MemoryManager(memoryConfig, mockLLMClient);
  });

  afterEach(() => {
    const fs = require('fs');
    if (fs.existsSync(memoryConfig.storagePath)) {
      fs.unlinkSync(memoryConfig.storagePath);
    }
  });

  describe('Memory Integration', () => {
    it('adds user message to memory', async () => {
      mockLLMClient.sendMessage.mockResolvedValue({
        content: 'Hello! How can I help you?'
      });

      const executor = new AgentExecutor({
        llmClient: mockLLMClient,
        tools: toolRegistry,
        memoryManager
      });

      await executor.processMessage('Hello');

      const stats = memoryManager.getStats();
      expect(stats.totalMessages).toBe(2); // user + assistant
    });

    it('includes memory context in prompt', async () => {
      mockLLMClient.sendMessage.mockImplementation(async (prompt) => {
        if (prompt.includes('Hello')) {
          return { content: 'Hi there!' };
        }
        return { content: 'Response' };
      });

      const executor = new AgentExecutor({
        llmClient: mockLLMClient,
        tools: toolRegistry,
        memoryManager
      });

      await executor.processMessage('Hello');

      expect(mockLLMClient.sendMessage).toHaveBeenCalled();
      const callArgs = mockLLMClient.sendMessage.mock.calls[0][0];
      expect(callArgs).toContain('Previous topics discussed');
      expect(callArgs).toContain('Recent conversation');
    });

    it('remembers context across multiple messages', async () => {
      let callCount = 0;
      mockLLMClient.sendMessage.mockImplementation(async (prompt) => {
        callCount++;
        if (callCount === 1) {
          return { content: 'Nice to meet you, Alice!' };
        }
        return { content: 'Your name is Alice.' };
      });

      const executor = new AgentExecutor({
        llmClient: mockLLMClient,
        tools: toolRegistry,
        memoryManager
      });

      await executor.processMessage('My name is Alice');
      await executor.processMessage('What is my name?');

      const stats = memoryManager.getStats();
      expect(stats.totalMessages).toBe(4); // 2 messages * 2 turns
    });

    it('works without memory (backward compatibility)', async () => {
      mockLLMClient.sendMessage.mockResolvedValue({
        content: 'Response without memory'
      });

      const executor = new AgentExecutor({
        llmClient: mockLLMClient,
        tools: toolRegistry
        // No memoryManager
      });

      const response = await executor.processMessage('Test');
      expect(response).toBe('Response without memory');
    });
  });
});
```

**Step 4: Run integration tests**

```bash
npm test src/agent/executor-memory-integration.test.ts
```

Expected: All integration tests pass

**Step 5: Run all executor tests to ensure no regressions**

```bash
npm test src/agent/executor.test.ts
```

Expected: All original executor tests still pass

**Step 6: Commit**

```bash
git add src/agent/executor.ts src/agent/executor-memory-integration.test.ts
git commit -m "phase4: integrate memory support into AgentExecutor"
```

---

## Task 6: Update CLI to Use Memory

**Files:**
- Modify: `src/cli/chat.ts`

**Step 1: Modify chat.ts to use MemoryManager**

```typescript
// Modify src/cli/chat.ts

import { loadConfig } from '../config/load';
import { GLMClient } from '../llm/glm';
import { ToolRegistry } from '../agent/tools';
import { echoTool, getTimeTool, fileListTool } from '../agent/built-in-tools';
import { AgentExecutor } from '../agent/executor';
import { MemoryManager } from '../memory/memory-manager'; // NEW
import * as readline from 'readline';

async function main() {
  // Load configuration
  const config = loadConfig();

  // Create GLM client
  const glmClient = new GLMClient({
    apiKey: config.glm.apiKey,
    baseURL: config.glm.baseURL,
    model: config.glm.model
  });

  // Create tool registry and register tools
  const toolRegistry = new ToolRegistry();
  toolRegistry.register(echoTool);
  toolRegistry.register(getTimeTool);
  toolRegistry.register(fileListTool);

  // NEW: Create shared memory manager
  const memoryManager = new MemoryManager(
    {
      storagePath: 'data/shared-memory.json',
      maxRecentMessages: 15,
      summarizeAfter: 20,
      maxSummaries: 50
    },
    glmClient
  );

  // NEW: Create agent with memory
  const agent = new AgentExecutor({
    llmClient: glmClient,
    tools: toolRegistry,
    memoryManager  // NEW
  });

  console.log('=== AI Assistant with Shared Memory ===');
  console.log('All sessions share the same memory context.');
  console.log(`Memory: ${JSON.stringify(memoryManager.getStats())}`);
  console.log('');
  console.log('Commands:');
  console.log('  /stats  - Show memory statistics');
  console.log('  /clear  - Information about clearing memory');
  console.log('  exit    - Exit the assistant');
  console.log('');

  // Create readline interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const promptUser = (): Promise<string> => {
    return new Promise((resolve) => {
      rl.question('You: ', (answer) => {
        resolve(answer.trim());
      });
    });
  };

  // Main chat loop
  while (true) {
    const input = await promptUser();

    if (input === 'exit') {
      console.log('Goodbye!');
      break;
    }

    if (input === '/stats') {
      const stats = memoryManager.getStats();
      console.log('Memory Statistics:');
      console.log(`  Total messages: ${stats.totalMessages}`);
      console.log(`  Recent messages: ${stats.recentCount}`);
      console.log(`  Summaries: ${stats.summaryCount}`);
      console.log(`  Last updated: ${stats.lastUpdated.toISOString()}`);
      continue;
    }

    if (input === '/clear') {
      console.log('Memory is shared across all sessions and persists to disk.');
      console.log('To reset memory, delete: data/shared-memory.json');
      console.log('Then restart the assistant.');
      continue;
    }

    if (input === '') {
      continue;
    }

    try {
      const response = await agent.processMessage(input);
      console.log('Assistant:', response);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  rl.close();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
```

**Step 2: Test chat CLI manually**

```bash
npm run chat
```

Test commands:
- Type: `Hello` → Should get response
- Type: `/stats` → Should show memory statistics
- Type: `My name is Alice` → Should get response
- Type: `What is my name?` → Should remember (may not work well without LLM, but memory should store it)
- Type: `exit` → Should exit cleanly

**Step 3: Test with multiple terminals**

Open two terminal windows:

Terminal 1:
```bash
npm run chat
You: My name is Alice
```

Terminal 2:
```bash
npm run chat
You: What is my name?
```

Expected: Terminal 2 should respond with context from Terminal 1 (memory is shared)

**Step 4: Commit**

```bash
git add src/cli/chat.ts
git commit -m "phase4: integrate shared memory into CLI"
```

---

## Task 7: Add Edge Case Handling and Tests

**Files:**
- Modify: `src/memory/memory-manager.test.ts` (add edge case tests)

**Step 1: Write edge case tests**

```typescript
// Add to src/memory/memory-manager.test.ts

  describe('Edge Cases', () => {
    it('handles empty summaries in getContext', () => {
      const manager = new MemoryManager(config, mockLLMClient);
      const context = manager.getContext();

      expect(context).toContain('(none)');
    });

    it('preserves message order in recent messages', async () => {
      const manager = new MemoryManager(config, mockLLMClient);

      await manager.addMessage({
        role: 'user',
        content: 'First',
        timestamp: new Date('2026-02-26T10:00:00.000Z')
      });

      await manager.addMessage({
        role: 'user',
        content: 'Second',
        timestamp: new Date('2026-02-26T10:01:00.000Z')
      });

      await manager.addMessage({
        role: 'user',
        content: 'Third',
        timestamp: new Date('2026-02-26T10:02:00.000Z')
      });

      const context = manager.getContext();
      const firstIndex = context.indexOf('First');
      const secondIndex = context.indexOf('Second');
      const thirdIndex = context.indexOf('Third');

      expect(firstIndex).toBeLessThan(secondIndex);
      expect(secondIndex).toBeLessThan(thirdIndex);
    });

    it('includes tool calls and results in messages', async () => {
      const manager = new MemoryManager(config, mockLLMClient);

      await manager.addMessage({
        role: 'assistant',
        content: 'Getting time...',
        timestamp: new Date(),
        toolCall: {
          name: 'get-time',
          params: {}
        },
        toolResult: '2026-02-26T18:30:00.000Z'
      });

      const stats = manager.getStats();
      expect(stats.recentCount).toBe(1);
    });

    it('handles system role messages', async () => {
      const manager = new MemoryManager(config, mockLLMClient);

      await manager.addMessage({
        role: 'system',
        content: 'System initialization',
        timestamp: new Date()
      });

      const stats = manager.getStats();
      expect(stats.recentCount).toBe(1);
    });

    it('does not trigger summarization before threshold', async () => {
      const manager = new MemoryManager(config, mockLLMClient);

      // Add 19 messages (below threshold of 20)
      for (let i = 0; i < 19; i++) {
        await manager.addMessage({
          role: 'user',
          content: `Message ${i}`,
          timestamp: new Date()
        });
      }

      const stats = manager.getStats();
      expect(stats.summaryCount).toBe(0);
      expect(stats.recentCount).toBe(19);
    });
  });
```

**Step 2: Run edge case tests**

```bash
npm test src/memory/memory-manager.test.ts --testNamePattern="Edge Cases"
```

Expected: All edge case tests pass

**Step 3: Run all memory tests**

```bash
npm test src/memory/memory-manager.test.ts
```

Expected: All memory tests pass

**Step 4: Commit**

```bash
git add src/memory/memory-manager.test.ts
git commit -m "phase4: add edge case handling and tests"
```

---

## Task 8: Comprehensive Test Run and Documentation

**Files:**
- Create: `src/blog/episode-8-adding-memory.md`

**Step 1: Run full test suite**

```bash
npm test
```

Expected: All tests pass (original 31 + new memory tests)

**Step 2: Check test count**

```bash
npm test -- --verbose 2>&1 | grep -E 'Tests:|PASS'
```

Expected: Should see 50+ tests (31 original + 20+ new)

**Step 3: Manual testing with real LLM**

```bash
npm run chat
```

Test scenario:
1. Session 1: "My name is Bob, I prefer Beijing time"
2. Session 2 (new terminal): "What's my name and preferred timezone?"
3. Check: Session 2 should remember from Session 1

**Step 4: Write blog episode 8**

Create comprehensive blog post about adding shared memory, covering:
- Why shared memory (all sessions share context)
- Architecture (MemoryManager, persistence, summarization)
- Implementation challenges (date serialization, error handling)
- Testing strategy (unit, integration, manual)
- What was learned

**Step 5: Update README.md**

Add section about memory features:
- Shared memory across sessions
- Automatic summarization
- Persistence to disk
- `/stats` command

**Step 6: Final commit**

```bash
git add src/blog/episode-8-adding-memory.md README.md
git commit -m "phase4: add documentation and blog episode 8"
```

**Step 7: Run final test suite**

```bash
npm test
```

Expected: All tests pass

---

## Task 9: Update Planning Documents

**Files:**
- Modify: `task_plan.md`
- Modify: `progress.md`

**Step 1: Update task_plan.md**

Mark Phase 4 complete:
```markdown
### Phase 4: Conversation & Memory ✅
- [x] MemoryManager implemented
- [x] Shared memory across all sessions
- [x] Automatic semantic summarization
- [x] Persistent storage (JSON file)
- [x] CLI integration with /stats command
- [x] All tests passing (50+ tests)
- [x] Blog episode 8 written
- **Status:** complete
```

**Step 2: Update progress.md**

Add session log for Phase 4 with:
- Timeline (actual days)
- Components built (MemoryManager, enhanced executor, CLI)
- Test results
- Lessons learned

**Step 3: Commit**

```bash
git add task_plan.md progress.md
git commit -m "phase4: update planning documents - phase complete"
```

---

## Verification Checklist

Before marking Phase 4 complete, verify:

- [ ] MemoryManager class implemented (~250 LOC)
- [ ] All data structures defined (types.ts)
- [ ] Shared memory works across multiple CLI sessions
- [ ] Automatic summarization triggers every 20 messages
- [ ] Memory persists to disk and survives restarts
- [ ] Agent includes memory context in prompts
- [ ] All unit tests pass (aim for 20+ memory tests)
- [ ] All integration tests pass
- [ ] All original tests still pass (no regressions)
- [ ] Manual testing: multiple terminals share memory
- [ ] CLI commands `/stats` and `/clear` work
- [ ] Blog episode 8 written
- [ ] README updated
- [ ] Code committed with clear messages

---

## Notes for Implementation

### Do's and Don'ts

**DO:**
- Follow TDD: test first, then implement
- Commit frequently after each task
- Test with real LLM for integration tests
- Handle all errors gracefully (never crash)
- Use types strictly (TypeScript)
- Test edge cases (empty memory, corrupted files)

**DON'T:**
- Skip tests to save time
- Commit broken code
- Ignore error handling
- Forget backward compatibility (memory is optional)
- Over-engineer (YAGNI)

### Key Implementation Details

**Summarization Trigger:**
- Happens every 20 messages (configurable)
- Only triggers if recentMessages > maxRecentMessages (15)
- Takes oldest 10 messages and summarizes them

**Persistence:**
- Saves after every addMessage
- Creates directory if missing
- Handles corrupted files by creating new memory
- Converts date strings to Date objects on load

**Error Handling:**
- Never throws from save() or summarizeOldMessages()
- Logs errors to console
- Keeps messages if summarization fails
- Creates new memory if load fails

**Context Building:**
- Summaries first (as bullet points)
- Recent messages second (verbatim)
- "(none)" for empty summaries
- Includes all message roles (user, assistant, system)

### Testing Strategy

**Unit Tests:**
- Test each method in isolation
- Mock LLM client for predictability
- Test file system operations with real temp files
- Test error scenarios

**Integration Tests:**
- Test executor with memory manager
- Test memory persistence across restarts
- Test context injection into prompts
- Test backward compatibility (no memory)

**Manual Tests:**
- Multiple terminals sharing memory
- /stats command
- Large conversation (trigger summarization)
- Corrupted file handling

---

**Plan complete and saved to:** `docs/plans/2026-02-26-phase4-conversation-memory-implementation.md`

Ready for execution with **superpowers:subagent-driven-development**!
