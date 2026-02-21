# Findings: OpenClaw Agent Architecture Study

## Project Context
- **Reference:** OpenClaw at `/Users/boycrypt/code/typescript/openclaw`
- **Current:** my-assistant at `/Users/boycrypt/code/typescript/my-assistant`
- **Goal:** Learn how agents work by extracting minimal components

---

## [Session 1] Agent System Deep Dive
**Date:** 2025-02-20

### Discovery 1: Agent Entry Points

**Main Command:** `src/commands/agent.ts`
- `agentCommand()` - Main CLI entry point
- Routes to `runCliAgent()` or `runEmbeddedPiAgent()`
- Handles session management and model selection

**Key Pattern:**
```typescript
async function runAgent({
  message,
  sessionId,
  sessionKey,
  agentId,
  workspaceDir,
  provider = "openai",
  model = "gpt-4",
  timeoutMs = 30000,
}) {
  const session = resolveSession({...});
  const workspace = ensureWorkspace({...});
  return runWithModelFallback({...});
}
```

### Discovery 2: Tool System Architecture

**Core Interface:** `src/agents/tools/common.ts`
- Uses `@mariozechner/pi-agent-core` for tool definitions
- Tools implement `AgentTool<T, R>` interface
- Parameter validation with TypeBox schemas

**Tool Example (web-search.ts):**
```typescript
const WebSearchSchema = Type.Object({
  query: Type.String({ description: "Search query string" }),
  count: Type.Optional(Type.Number({ minimum: 1, maximum: 10 })),
});

async function webSearchTool(params: { query: string; count?: number }) {
  // Implementation
  return jsonResult(results);
}
```

**Tool Registration:**
- Workspace skills discovery
- Static tool registration in config
- Client-provided tools

### Discovery 3: Message Flow

**Location:** `src/agents/pi-embedded-runner/run.ts`

**Flow:**
```
1. Receive message + optional images
2. Build conversation context
3. Call LLM with tools
4. Execute tools as requested
5. Generate response with tool results
6. Return formatted response
```

**Key Functions:**
- `runEmbeddedPiAgent()` - Main execution
- `runEmbeddedAttempt()` - Single attempt
- Tool result processing

### Discovery 4: LLM Integration

**Dependencies:**
- `@mariozechner/pi-agent-core` - Agent framework
- `@mariozechner/pi-ai` - AI client library

**Integration Pattern:**
```typescript
import { runEmbeddedPiAgent } from "@mariozechner/pi-agent-core";

const result = await runEmbeddedPiAgent({
  sessionId: "session-123",
  workspaceDir: "./workspace",
  config: agentConfig,
  prompt: userMessage,
  provider: "openai",
  model: "gpt-4",
  tools: [webSearchTool, fileListTool],
});
```

**Providers Supported:**
- OpenAI, Anthropic, Google, etc.
- Model fallback mechanism
- Authentication profile management

### Discovery 5: Minimal Components Needed

**Core Dependencies:**
- `@mariozechner/pi-agent-core` - Agent framework
- `@mariozechner/pi-ai` - AI client
- `@sinclair/typebox` - Schema validation

**File Structure:**
```
my-assistant/
├── src/
│   ├── agent/
│   │   ├── executor.ts      # Agent execution logic
│   │   ├── tools.ts         # Tool definitions
│   │   ├── config.ts        # Minimal configuration
│   │   └── cli.ts           # CLI interface
├── workspace/               # Agent workspace
│   └── skills/             # Tool definitions
```

### Discovery 6: Architecture Insights

**Layered Approach:**
1. **CLI Layer** - Command parsing
2. **Agent Executor** - Orchestration
3. **Embedded Runner** - LLM integration
4. **Tools** - Capabilities

**Minimal Requirements:**
- Agent executor (runAgent function)
- Tool interface (AgentTool)
- LLM client (will use our GLM client)
- Workspace management
- Simple CLI

### Discovery 7: Integration Strategy

**What We Need to Build:**

1. **Agent Executor** - Custom version using GLM client
   - Message reception
   - Tool orchestration
   - Response formatting

2. **Tool System** - Simple interface
   ```typescript
   interface Tool<T, R> {
     name: string;
     description: string;
     parameters: Schema;
     execute: (params: T) => Promise<R>;
   }
   ```

3. **Simple CLI** - Interactive interface
   ```typescript
   async function cliAgent(message: string) {
     const tools = loadTools();
     const result = await executeAgent(message, tools);
     console.log(result);
   }
   ```

**Adaptation Needed:**
- ❌ Don't use `@mariozechner/*` packages (too complex)
- ✅ Use our existing GLM client
- ✅ Build simplified tool system
- ✅ Create custom message handling

---

## To Investigate Next
- [ ] Build simplified tool interface
- [ ] Create agent executor using GLM client
- [ ] Implement 2-3 simple tools (echo, file-list)
- [ ] Build simple CLI for testing
- [ ] Test end-to-end flow

---

## Key Questions Answered

✅ **What's the minimal agent?** Message → LLM → Tool → Result loop
✅ **How are tools defined?** Interface with schema and execute function
✅ **How does agent decide?** LLM function calling with tool descriptions
✅ **Simplest way to test?** CLI with single message execution
