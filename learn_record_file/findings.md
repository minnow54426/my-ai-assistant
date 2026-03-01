# Findings: OpenClaw Agent Architecture Study

## Project Context
- **Reference:** OpenClaw at `/Users/boycrypt/code/typescript/openclaw`
- **Current:** my-assistant at `/Users/boycrypt/code/typescript/my-assistant`
- **Goal:** Learn how agents work by extracting minimal components

## OpenClaw Architecture Overview

### Entry Points
- `openclaw.mjs` - Main CLI entry point
- `src/entry.ts` - Application bootstrap
- `src/index.ts` - CLI program builder

### Key Directories
- `src/agents/` - Agent execution framework
- `src/gateway/` - HTTP/WebSocket server
- `src/channels/` - Messaging platform integrations
- `src/skills/` - Extension capabilities
- `src/infra/` - Infrastructure utilities

## Discoveries Log

### [Phase 1] - Initial Exploration
*Date: 2025-02-20*

**Finding 1: Agent Execution System**
- Location: `src/agents/`
- Key files:
  - `executor.ts` - Manages agent processes
  - `session.ts` - Session handling
  - `tool.ts` - Tool definitions and execution
- Notes: OpenClaw uses PTY (pseudo-terminal) for interactive agents

**Finding 2: Tool System**
- Tools are defined with schemas (name, description, parameters)
- Tools can be synchronous or asynchronous
- Tool registry manages available tools
- Location: `src/agents/tool.ts` and skills folder

**Finding 3: Message Flow**
```
User Message → Channel Handler → Gateway → Agent
Agent → LLM (decides tool) → Tool Execution → Result → LLM → User
```

**Finding 4: LLM Integration**
- OpenClaw uses multiple providers (Anthropic, OpenAI, Pi)
- Abstract client interface allows switching
- Prompts include tool definitions for function calling

### [Phase 6] - Code Cleanup & Simplification
*Date: 2026-03-01*

**Finding 5: Unused Dead Code Accumulation**
- Old memory system types (ConversationMessage, MemorySummary, SharedMemory, etc.) were superseded by new OpenClaw-style system but not removed
- Lesson: When implementing new systems, proactively remove old abstractions
- Impact: 70+ lines of confusing legacy types

**Finding 6: Unused Features Never Integrated**
- MMR re-ranking and temporal decay were implemented as modules but never wired into MemorySystem
- Configuration options existed in MemorySystemConfig but were unused
- Lesson: Either integrate features immediately or remove them; partial implementation creates confusion
- Impact: 2 modules + tests deleted (~150 lines)

**Finding 7: Multiple Embedding Providers**
- Had OpenAIEmbeddingProvider and ConfigurableEmbeddingProvider
- Only ConfigurableEmbeddingProvider was used in production code
- Lesson: Keep YAGNI (You Aren't Gonna Need It) in mind - don't build flexibility until needed
- Impact: Deleted entire openai.ts file

**Finding 8: Database Schema vs Implementation Mismatch**
- Schema defined embedding_cache table with methods (getCachedEmbedding, cacheEmbedding)
- Methods existed but were never called
- Lesson: Database schema should match actual usage; unused tables waste space and cause confusion
- Impact: Removed cache table and 5 unused database methods

**Finding 9: Configuration Bloat**
- ChannelConfig for Discord/Slack integration was defined but never implemented
- defaultConfig export existed but wasn't used by loadConfig
- Lesson: Don't define interfaces for features you might add someday
- Impact: Removed 2 unnecessary configuration files

**Finding 10: Tests Can Hide Dead Code**
- mmr.test.ts and temporal-decay.test.ts passed but tested code that was never called
- Having passing tests doesn't mean code is being used
- Lesson: Integration tests and code coverage analysis help identify unused code
- Impact: Deleted 4 test files for unused modules

## To Investigate
- [x] How does the agent decide which tool to call? (Phase 1)
- [x] What's the minimal prompt format needed? (Phase 1)
- [x] How are tool results returned to the LLM? (Phase 1)
- [x] What's the simplest agent configuration? (Phase 1)
- [x] Code cleanup and simplification (Phase 6)
