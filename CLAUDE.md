# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a learning project to understand how AI agents work by building a minimal agent from scratch. The agent integrates with GLM-4.6 (ChatGLM) and uses a tool-based architecture for executing tasks.

**Current State:** Phase 1 complete (working agent with 3 tools), Phase 2 in progress (deep study and blog writing).

## Essential Commands

### Development & Testing

```bash
# Install dependencies
npm install

# Run all tests (36 tests)
npm test

# Run specific test file
npm test -- src/agent/tools.test.ts

# Run tests in watch mode
npm run test:watch

# Run integration tests with real API
npm test -- src/llm/glm-integration.test.ts
npm test -- src/agent/executor-integration.test.ts
```

### Running the Agent

```bash
# Interactive chat CLI
npm run chat

# Run demo/test script
npx tsx src/examples/test-agent.ts

# Test specific functionality
npx tsx src/examples/glm-usage.ts
npx tsx src/examples/config-test.ts
```

### TypeScript Compilation

```bash
# Compile TypeScript files (uses ts-node/tsx implicitly)
npx tsx <file>

# Run TypeScript directly with ts-node
npx ts-node <file>
```

## Architecture

### High-Level Flow

```
User Message → AgentExecutor → GLM Client → GLM API
                                              ↓
                                         Tool Decision
                                              ↓
                                   ToolRegistry → Tool Execution
                                              ↓
                                         Result → GLM → User
```

### Core Components

**Agent System** (`src/agent/`)
- `tools.ts` - Tool interface (`Tool<T, R>`) and ToolRegistry (Map-based storage)
- `executor.ts` - Agent "brain" that processes messages, decides tool usage, manages LLM interaction
- `built-in-tools.ts` - Three tools: echo, get-time (Beijing timezone UTC+8), file-list (recursive)

**LLM Integration** (`src/llm/`)
- `glm.ts` - GLM API client using node-fetch
  - Handles authentication, request/response, error handling
  - Supports custom baseURL for different providers

**Configuration** (`src/config/`)
- `types.ts` - Config interfaces (AgentConfig, ChannelConfig, Config)
- `load.ts` - Loads from `~/.my-assistant/config.json` and `.env`
- `default.ts` - Default configuration values

**CLI** (`src/cli/`)
- `chat.ts` - Interactive readline-based chat interface

### Type System

The project heavily uses TypeScript generics for type safety:

```typescript
// Tool interface with generics for input/output types
interface Tool<T = Record<string, unknown>, R = unknown> {
  name: string;
  description: string;
  parameters: ToolParameterSchema;
  execute: (params: T) => Promise<R>;
}

// ToolRegistry methods are generic to preserve type information
register<T, R>(tool: Tool<T, R>): void
async execute<T, R>(name: string, params: T): Promise<R>
```

This design allows the registry to handle tools with different parameter and return types while maintaining type safety.

### Tool Call Flow

1. User sends message via CLI
2. AgentExecutor builds system prompt with tool descriptions
3. GLM client sends prompt to GLM API
4. Agent parses LLM response for tool calls using regex: `/Using tool:\s*([\w-]+)\s+with params:\s*(\{.*\})/i`
5. If tool call detected:
   - Execute tool via ToolRegistry
   - Send result back to GLM for natural language response
6. Return final response to user

### Critical Implementation Details

**Tool Call Parsing** (`src/agent/executor.ts:116`)
- Regex must handle hyphens in tool names: `[\w-]+` not just `\w+`
- Pattern: `"Using tool: <name> with params: <json>"`
- Example: `"Using tool: get-time with params: {}"`

**Beijing Time Conversion** (`src/agent/built-in-tools.ts:55-60`)
- Adds 8 hours to UTC time: `new Date(now.getTime() + (8 * 60 * 60 * 1000))`
- Returns formatted string with timezone label

**Recursive File Listing** (`src/agent/built-in-tools.ts:97-122`)
- Recursive by default (scans subdirectories)
- Glob pattern matching: `*.ts` matches files at any depth
- Returns `{ directory, files, count }` structure

### Environment Configuration

Required `.env` file:
```env
GLM_API_KEY=sk-xxxxxxxxxxxxxxxxxx
GLM_URL=https://apis.iflow.cn/v1/chat/completions
```

Config file location: `~/.my-assistant/config.json`
```json
{
  "agent": {
    "provider": "glm",
    "apiKey": "",  // Loaded from .env
    "model": "glm-4.6",
    "baseURL": ""  // Loaded from .env
  }
}
```

## Learning Project Context

This is a 4-phase learning journey:

- **Phase 1** (Complete): Extract & Run - Built minimal working agent
- **Phase 2** (In Progress): Deep Study - Understanding via blog writing (see `src/blog/`)
- **Phase 3** (Pending): Rebuild from Scratch - Solidify understanding
- **Phase 4** (Pending): Extend - Add custom features

See `docs/plans/2025-02-20-agent-learning-plan.md` for the full learning plan.

## Testing Philosophy

This project uses TDD (Test-Driven Development):
- Tests written before implementation
- 36 tests passing (unit + integration)
- Integration tests use real GLM API
- Tests are in `*.test.ts` files alongside source code

When adding new features:
1. Write tests first
2. Watch them fail (RED)
3. Implement minimal code to pass (GREEN)
4. Refactor if needed

## Key Constraints & Patterns

- **No external agent frameworks** - Built from scratch to learn
- **GLM-specific** - Uses custom baseURL, not standard OpenAI/Anthropic APIs
- **Simple JSON Schema** for tool parameters - No TypeBox or complex validation
- **Map-based registry** - Simple and efficient tool storage
- **Tool call format** - Text-based parsing, not structured function calling
