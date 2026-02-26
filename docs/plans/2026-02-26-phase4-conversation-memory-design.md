# Phase 4 Design: Conversation & Memory - Shared Context Across Sessions

**Date:** 2026-02-26
**Status:** Approved
**Author:** boycrypt & Claude
**Phase:** 4 - Conversation & Memory

## Overview

Phase 4 adds a **shared memory system** to the my-assistant agent, enabling all CLI sessions to share conversation context. The system uses smart semantic summarization to maintain long-term memory while keeping context size manageable.

**Current Foundation (Phase 3):**
- Stateless agent executor (each message processed independently)
- Tool system with 3 tools (echo, get-time, file-list)
- GLM client integration
- ~493 LOC core, 10/10 confidence

**What We're Adding:**
- Shared memory across all sessions
- Automatic semantic summarization
- Persistent storage (JSON file)
- Enhanced agent executor with memory awareness

**Timeline:** 5-7 days

---

## Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────┐
│                      CLI Layer                          │
│                  (chat.ts, multiple sessions)           │
│  Session 1 │ Session 2 │ Session 3 │ Session N         │
└────────────────────┬────────────────────────────────────┘
                     │ All sessions share same memory
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Shared Memory Manager                      │
│  - Manages single shared memory for all sessions        │
│  - Automatic summarization (every 20 messages)          │
│  - Persists to shared-memory.json                       │
└────────────────────┬────────────────────────────────────┘
                     │ Provides context
                     ▼
┌─────────────────────────────────────────────────────────┐
│             Enhanced Agent Executor                     │
│  - Builds context from summaries + recent messages      │
│  - Stateless processing (per message)                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                   Tool Layer + LLM                      │
└─────────────────────────────────────────────────────────┘
```

### Key Design Principles

1. **Shared Memory**: All CLI sessions contribute to and access the same memory
2. **Stateless Executor**: AgentExecutor doesn't hold state, receives context from MemoryManager
3. **Separation of Concerns**: Memory is independent, can be tested without executor
4. **Simple Persistence**: Single JSON file, easy to inspect and debug
5. **Graceful Degradation**: Memory errors never crash the system

---

## Data Structures

### ConversationMessage

```typescript
interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolCall?: ToolCall;
  toolResult?: unknown;
}
```

A single message in a conversation. Captures everything needed to reconstruct the conversation history.

### MemorySummary

```typescript
interface MemorySummary {
  summary: string;
  messageCount: number;
  createdAt: Date;
  coveredPeriod: {
    start: Date;
    end: Date;
  };
}
```

A semantic summary of older messages. Created automatically every 20 messages by the LLM.

### SharedMemory

```typescript
interface SharedMemory {
  recentMessages: ConversationMessage[];
  summaries: MemorySummary[];
  totalMessagesProcessed: number;
  lastUpdated: Date;
}
```

The complete shared memory state. Contains recent messages (verbatim) and all semantic summaries.

### MemoryConfig

```typescript
interface MemoryConfig {
  maxRecentMessages: number;      // Keep last N messages verbatim (default: 15)
  summarizeAfter: number;         // Summarize after N new messages (default: 20)
  maxSummaries: number;           // Keep maximum N summaries (default: 50)
  storagePath: string;            // Path to shared-memory.json
}
```

Tunable parameters for memory management behavior.

---

## Core Component: MemoryManager

### Class Definition

```typescript
class MemoryManager {
  private memory: SharedMemory;
  private config: MemoryConfig;
  private llmClient: GLMClient;

  constructor(config: MemoryConfig, llmClient: GLMClient);

  // Public API
  async addMessage(message: ConversationMessage): Promise<void>;
  getContext(): string;
  getStats(): MemoryStats;

  // Private methods
  private async summarizeOldMessages(): Promise<void>;
  private buildSummaryPrompt(messages: ConversationMessage[]): string;
  private loadOrCreate(): SharedMemory;
  private async save(): Promise<void>;
}
```

### Key Behaviors

**1. Add Message**
```typescript
async addMessage(message: ConversationMessage): Promise<void> {
  this.memory.recentMessages.push(message);
  this.memory.totalMessagesProcessed++;
  this.memory.lastUpdated = new Date();

  // Check if we need to summarize
  if (this.memory.totalMessagesProcessed % this.config.summarizeAfter === 0) {
    await this.summarizeOldMessages();
  }

  await this.save();
}
```

**2. Get Context for LLM**
```typescript
getContext(): string {
  const summariesText = this.memory.summaries
    .map(s => `- ${s.summary}`)
    .join('\n');

  const recentText = this.memory.recentMessages
    .map(m => `${m.role}: ${m.content}`)
    .join('\n');

  return `Previous topics discussed:\n${summariesText || '(none)'}\n\nRecent conversation:\n${recentText}`;
}
```

**3. Automatic Summarization**
```typescript
private async summarizeOldMessages(): Promise<void> {
  // Take oldest 10 messages
  const messagesToSummarize = this.memory.recentMessages.splice(0, 10);

  // Generate summary using LLM
  const summaryPrompt = this.buildSummaryPrompt(messagesToSummarize);
  const response = await this.llmClient.sendMessage(summaryPrompt);

  // Create summary object
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

  // Prune old summaries if needed
  if (this.memory.summaries.length > this.config.maxSummaries) {
    this.memory.summaries.splice(0, this.memory.summaries.length - this.config.maxSummaries);
  }
}
```

**4. Build Summary Prompt**
```typescript
private buildSummaryPrompt(messages: ConversationMessage[]): string {
  const messagesText = messages
    .map(m => `${m.role}: ${m.content}`)
    .join('\n');

  return `Summarize the following conversation messages into ONE concise sentence (max 30 words).

${messagesText}

Summary:`;
}
```

### File Storage

**Storage Path:** `data/shared-memory.json`

**File Structure:**
```json
{
  "recentMessages": [
    {
      "role": "user",
      "content": "What time is it?",
      "timestamp": "2026-02-26T10:30:00.000Z"
    },
    {
      "role": "assistant",
      "content": "Beijing Time is 18:30...",
      "timestamp": "2026-02-26T10:30:02.000Z",
      "toolCall": {
        "name": "get-time",
        "params": {}
      },
      "toolResult": "2026-02-26T18:30:02.123..."
    }
  ],
  "summaries": [
    {
      "summary": "User asked about file system tools, was shown file-list and echo tools",
      "messageCount": 10,
      "createdAt": "2026-02-26T09:00:00.000Z",
      "coveredPeriod": {
        "start": "2026-02-26T08:00:00.000Z",
        "end": "2026-02-26T09:00:00.000Z"
      }
    }
  ],
  "totalMessagesProcessed": 45,
  "lastUpdated": "2026-02-26T10:30:02.000Z"
}
```

**Load Behavior:**
- If file exists: Load and parse JSON
- If file missing: Create new empty memory
- If file corrupted: Log warning, create new memory

**Save Behavior:**
- Called after every `addMessage`
- Safe failure: Log error but don't throw
- Creates directory if missing

---

## Enhanced Agent Executor

### Modified Class

```typescript
export interface AgentExecutorConfig {
  llmClient: GLMClient;
  tools: ToolRegistry;
  memoryManager?: MemoryManager; // NEW - optional for backward compatibility
}

export class AgentExecutor {
  private memoryManager?: MemoryManager; // NEW

  async processMessage(message: string): Promise<string> {
    // NEW: Add user message to shared memory
    if (this.memoryManager) {
      await this.memoryManager.addMessage({
        role: 'user',
        content: message,
        timestamp: new Date()
      });
    }

    // NEW: Include shared memory context
    const memoryContext = this.memoryManager
      ? `\n\n${this.memoryManager.getContext()}\n\n`
      : '';

    const prompt = `${systemPrompt}${memoryContext}User: ${message}\nAssistant:`;
    const response = await this.llmClient.sendMessage(prompt);

    // ... tool execution logic ...

    // NEW: Add assistant response to memory
    if (this.memoryManager) {
      await this.memoryManager.addMessage({
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        toolCall,
        toolResult
      });
    }

    return response.content;
  }
}
```

### Backward Compatibility

```typescript
// Old way (still works, no memory):
const agent = new AgentExecutor({ llmClient, tools });

// New way (with shared memory):
const agent = new AgentExecutor({ llmClient, tools, memoryManager });
```

---

## CLI Integration

### Enhanced chat.ts

```typescript
import { MemoryManager } from '../memory/memory-manager';

async function main() {
  // Create shared memory manager (all sessions share this)
  const memoryManager = new MemoryManager(
    {
      storagePath: 'data/shared-memory.json',
      maxRecentMessages: 15,
      summarizeAfter: 20,
      maxSummaries: 50
    },
    glmClient
  );

  // Create agent with memory
  const agent = new AgentExecutor({
    llmClient: glmClient,
    tools: toolRegistry,
    memoryManager  // Now all chat sessions share memory!
  });

  console.log('AI Assistant with Shared Memory');
  console.log('All sessions share the same memory context.');
  console.log(`Memory stats: ${JSON.stringify(memoryManager.getStats())}`);
  console.log('Type "exit" to quit, "/stats" to see memory info\n');

  // Main chat loop
  while (true) {
    const input = await prompt('You: ');

    if (input === 'exit') break;
    if (input === '/stats') {
      console.log('Memory:', memoryManager.getStats());
      continue;
    }
    if (input === '/clear') {
      console.log('Cannot clear shared memory - it persists across sessions.');
      console.log('Delete data/shared-memory.json to reset.');
      continue;
    }

    const response = await agent.processMessage(input);
    console.log('Assistant:', response);
  }
}
```

### New CLI Commands

- `/stats` - Show memory statistics (total messages, summaries, last updated)
- `/clear` - Explain that memory is shared and persistent

### Multi-Session Example

```
Terminal 1:                    Terminal 2:
You: My name is Alice
Assistant: Hi Alice!

                              You: What is my name?
                              Assistant: Your name is Alice (from shared memory!)
```

---

## Error Handling

### Philosophy

**Never crash on memory errors** - Memory is a nice-to-have feature, not critical to agent operation.

### Key Error Scenarios

**1. Save Failure**
```typescript
private async save(): Promise<void> {
  try {
    fs.writeFileSync(this.config.storagePath, JSON.stringify(this.memory));
  } catch (error) {
    console.error('Failed to save memory:', error);
    // Memory continues to work in-memory, just won't persist
    // Don't throw - agent continues functioning
  }
}
```

**2. Summarization Failure**
```typescript
private async summarizeOldMessages(): Promise<void> {
  try {
    const summary = await this.llmClient.sendMessage(summaryPrompt);
    // ... create summary
  } catch (error) {
    console.error('Failed to summarize messages:', error);
    // Keep messages instead of losing them
    this.memory.recentMessages.unshift(...messagesToSummarize);
  }
}
```

**3. Load Failure (Corrupted File)**
```typescript
private loadOrCreate(): SharedMemory {
  try {
    if (fs.existsSync(this.config.storagePath)) {
      return JSON.parse(fs.readFileSync(this.config.storagePath, 'utf-8'));
    }
  } catch (error) {
    console.warn('Failed to load memory, creating new:', error);
  }
  // Return empty memory state
  return {
    recentMessages: [],
    summaries: [],
    totalMessagesProcessed: 0,
    lastUpdated: new Date()
  };
}
```

---

## Testing Strategy

### Unit Tests (memory-manager.test.ts)

**Basic Operations:**
- Creates new memory if file does not exist
- Adds message to recent messages
- Builds context with summaries and recent messages
- Returns accurate statistics

**Summarization:**
- Triggers summarization after 20 messages
- Summarizes oldest 10 messages
- Prunes summaries when exceeding maxSummaries
- Generates concise summaries (max 30 words)

**Persistence:**
- Saves memory to disk after each addMessage
- Loads existing memory from disk
- Handles corrupted file gracefully
- Preserves Date objects correctly

**Edge Cases:**
- Handles empty summaries gracefully in getContext
- Preserves message order in recent messages
- Handles concurrent addMessage calls
- Handles tool calls and results in messages

### Integration Tests (executor-memory-integration.test.ts)

**Memory Integration:**
- Agent remembers context across multiple messages
- Agent uses tool results in memory
- Multiple sessions share the same memory
- Context is properly injected into prompts

**End-to-End:**
- User message → memory → LLM → response → memory
- Tool call → result → memory → LLM → final response
- Summarization triggered after threshold
- Memory persists across agent restarts

---

## Implementation Timeline

**Total Estimated Time:** 5-7 days

### Day 1: Core Memory Structures
- Create `src/memory/` directory
- Implement all interfaces (ConversationMessage, MemorySummary, SharedMemory, MemoryConfig)
- Write basic tests for data structures
- **Commit:** memory interfaces and basic tests

### Day 2: Memory Manager - Basic Operations
- Implement MemoryManager class (constructor, addMessage, getContext)
- Implement load/save functionality with JSON file
- Write tests for basic operations (add, get context, stats)
- **Commit:** memory manager with persistence

### Day 3: Memory Manager - Summarization
- Implement summarizeOldMessages method
- Implement buildSummaryPrompt method
- Implement summary pruning logic
- Write tests for summarization triggers and logic
- **Commit:** summarization logic

### Day 4: Enhanced Agent Executor
- Modify AgentExecutor to accept optional memoryManager
- Update processMessage to add messages to memory
- Update prompt building to include memory context
- Write integration tests for executor with memory
- **Commit:** executor with memory integration

### Day 5: CLI Integration & Testing
- Update chat.ts to use MemoryManager
- Add `/stats` and `/clear` commands
- Manual testing: multiple terminals sharing memory
- Fix any bugs discovered during testing
- **Commit:** CLI integration

### Day 6: Edge Cases & Refinement
- Handle corrupted memory files
- Test concurrent access scenarios
- Add comprehensive error handling
- Performance testing with large memory
- Add memory statistics command
- **Commit:** robust error handling and polish

### Day 7: Documentation & Blog Episode
- Write blog episode 8: "Adding Memory - Shared Context Across Sessions"
- Update README with memory features
- Final comprehensive test run
- **Commit:** documentation

---

## Deliverables

### Code Files

**New Files:**
- `src/memory/memory-manager.ts` (~250 LOC)
- `src/memory/types.ts` (~80 LOC)
- `src/memory/memory-manager.test.ts` (~300 LOC)

**Modified Files:**
- `src/agent/executor.ts` (+30 LOC - add memory integration)
- `src/cli/chat.ts` (+20 LOC - add memory manager and stats command)

**Documentation:**
- `src/blog/episode-8-adding-memory.md` (~400 lines)
- Updated README.md with memory features

### Metrics

- **Total New Code:** ~380 LOC (excluding tests)
- **Total New Tests:** ~300 LOC
- **Estimated Tests:** 20+ new tests
- **New Dependencies:** None (using existing fs, path)

---

## Success Criteria

- [ ] Multiple CLI sessions share memory
- [ ] Agent remembers previous messages across sessions
- [ ] Automatic summarization works every 20 messages
- [ ] Summaries are concise (max 30 words)
- [ ] Memory persists to disk and survives restarts
- [ ] Context is properly included in LLM prompts
- [ ] All tests pass (aim for 20+ new tests)
- [ ] Error handling is robust (never crashes on memory errors)
- [ ] Blog episode 8 written
- [ ] Manual testing: multiple terminals demonstrate shared memory

---

## OpenClaw Patterns Learned

**1. Session File Structure**
- OpenClaw stores sessions as JSON files
- We use the same pattern for shared memory

**2. Message History Management**
- OpenClaw maintains message arrays with timestamps
- We use the same ConversationMessage structure

**3. Context Window Management**
- OpenClaw prunes old messages when limit exceeded
- We use semantic summarization instead (more advanced)

**4. Simple Persistence**
- OpenClaw uses file-based storage (no database)
- We follow the same YAGNI principle

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Summarization quality varies | Medium | Use good summary prompt, test with real conversations |
| Context window overflow | High | Limit summaries (max 50), limit recent messages (15) |
| File corruption | Low | Graceful handling, create new memory if corrupted |
| Concurrent access issues | Low | File system locks, or accept occasional conflicts (non-critical) |
| Performance degradation | Low | Summarization is async, doesn't block responses |

---

## Future Enhancements (Out of Scope for Phase 4)

- **Semantic search**: Retrieve relevant summaries based on query similarity
- **Importance scoring**: Only summarize important messages, drop mundane ones
- **Topic-based summarization**: Detect topic shifts and summarize by topic
- **User preferences**: Remember user preferences (timezone, format, etc.)
- **Multi-user support**: Separate memory per user ID
- **Database storage**: Migrate to SQLite for better query performance
- **Memory visualization**: Web UI to browse memory and summaries

---

## Design Decisions

### Why Shared Memory (Not Per-Session)?

**Decision:** All sessions share the same memory.

**Rationale:**
- Simpler to implement and reason about
- Matches the user's mental model (the AI "knows" what we discussed)
- Useful for single-user scenarios (the primary use case)
- Easier to test and debug

**Trade-off:** Not suitable for multi-user scenarios. Can add user-scoped memory later if needed.

### Why Automatic Chunking (Not Topic-Based)?

**Decision:** Summarize every 20 messages automatically.

**Rationale:**
- Deterministic and testable
- No complex topic detection logic needed
- Predictable memory usage
- Can add topic detection later as enhancement

**Trade-off:** May summarize across unrelated topics. Topic detection in Phase 5 would address this.

### Why JSON File (Not Database)?

**Decision:** Single JSON file for persistence.

**Rationale:**
- Simple to implement and debug
- Human-readable (can inspect manually)
- No database dependencies
- Sufficient for current scale
- YAGNI principle

**Trade-off:** Not scalable for millions of messages. Can migrate to SQLite in Phase 5+ if needed.

### Why Semantic Summaries (Not Just Pruning)?

**Decision:** Convert old messages to semantic summaries.

**Rationale:**
- Preserves important context longer
- More efficient than storing all messages
- LLM can understand and use summaries
- Matches how human memory works (we remember concepts, not verbatim)

**Trade-off:** Summary quality varies. Good prompt engineering mitigates this.

---

## Conclusion

Phase 4 adds a sophisticated shared memory system that enables the AI assistant to maintain long-term context across all sessions. The design balances simplicity (JSON file storage) with intelligence (semantic summarization), following YAGNI principles while building a foundation for future enhancements.

**Key Innovation:** Smart semantic summarization that preserves important context while keeping memory size manageable.

**Learning from OpenClaw:** Session file structure, message history management, simple persistence patterns.

**Next Phase:** Phase 5 will add streaming responses for better UX.
