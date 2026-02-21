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

---

## [Session 2] Building Tool System with TDD
**Date:** 2025-02-20

### Discovery: Tool System Simplicity

**What We Built:**
```typescript
interface Tool<T, R> {
  name: string;
  description: string;
  parameters: ToolParameterSchema;
  execute: (params: T) => Promise<R>;
}
```

**Key Insights:**
1. **Tools are simple** - Just a name, description, parameters, and execute function
2. **Registry pattern** - Map-based registry for managing tools
3. **Type safety** - Generics allow type-safe parameter passing and results
4. **JSON Schema** - Using simple JSON schema for parameters (simpler than TypeBox)

**Tools Created:**
- `echo` - Returns message (for testing)
- `get-time` - Returns current timestamp
- `file-list` - Lists files in directory

**TDD Process Worked:**
1. Wrote test → Saw it fail (RED)
2. Wrote minimal code → Saw it pass (GREEN)
3. No refactoring needed yet

**Test Results:** 17 tests pass (9 for tool system, 8 for built-in tools)

### Comparison with OpenClaw

| Aspect | OpenClaw | Our Implementation |
|--------|----------|-------------------|
| Interface | `AgentTool<T,R>` from pi-agent-core | Simple `Tool<T,R>` interface |
| Parameters | TypeBox schemas | JSON Schema (simpler) |
| Registry | Complex with workspace discovery | Simple Map-based |
| Tools | Many built-in | 3 simple tools to start |

### Lessons Learned
- **Simpler is better for learning** - We don't need TypeBox yet
- **TypeScript generics are powerful** - Type-safe tool execution
- **TDD prevents over-engineering** - Tests told us when we had enough
- **Start small** - 3 tools is enough to understand the concept

### Files Created
- `src/agent/tools.ts` - Tool interface and registry
- `src/agent/built-in-tools.ts` - 3 simple tools
- `src/agent/tools.test.ts` - Tool system tests
- `src/agent/built-in-tools.test.ts` - Built-in tools tests


---

## [Session 4] Building Agent Executor
**Date:** 2025-02-20

### Discovery: How Agents Decide What to Do

**The Core Flow:**
```
User Message → Agent → LLM (with tools) → Agent → Tool → Result → LLM → User
```

**Key Components:**
1. **System Prompt** - Tells LLM what tools are available
2. **Tool Call Detection** - Parse LLM response for tool usage
3. **Tool Execution** - Run the tool with parameters
4. **Response Generation** - Send result back to LLM for final answer

**Implementation Insights:**

**Tool Call Format:**
```
"Using tool: <name> with params: <json>"
```

**Example:**
```
LLM: "Using tool: echo with params: {"message":"hello"}"
Agent: Executes echo tool
Agent: Sends result to LLM: "I echoed 'hello' for you. The result was: Echo: hello"
LLM: Returns final response to user
```

**Simple Parsing Works:**
- Used regex: `/Using tool:\s*(\w+)\s+with params:\s*(\{.*\})/i`
- No complex function calling needed (yet!)
- GLM-4.6 understands the format well

### Test Results
- Unit tests: 8 passed
- Integration tests: 5 passed (with real GLM API!)
- **Total: 36 tests passing**

### Integration Test Highlights

**Test 1: Simple Message**
```
User: "Hello! What's your name?"
Agent: Responds without using tools
```

**Test 2: Echo Tool**
```
User: "Please echo the message: Hello World"
LLM: "Using tool: echo with params: {"message":"Hello World"}"
Tool: Returns "Echo: Hello World"
Agent: Final response with echoed message
```

**Test 3: Get-Time Tool**
```
User: "What time is it?"
LLM: "Using tool: get-time with params: {}"
Tool: Returns timestamp
Agent: Explains the time to user
```

**Test 4: List Tools**
```
User: "What tools do you have?"
Agent: Lists all 3 tools with descriptions
```

**Test 5: Error Handling**
```
User: "List files in /nonexistent/directory"
Tool: Throws error
Agent: Handles gracefully, explains error
```

### Key Learnings

1. **LLMs Can Follow Simple Patterns** - No complex protocol needed
2. **Two-Step Process Works** - LLM decision → Tool execution → LLM final response
3. **Error Handling Critical** - Tools fail, agent must handle gracefully
4. **Integration Tests Essential** - Unit tests pass, but real API tests show truth

### Comparison with OpenClaw

| Aspect | OpenClaw | Our Implementation |
|--------|----------|-------------------|
| Tool Calling | Complex function calling protocol | Simple text pattern |
| Multi-step | Conversational multi-turn | Two-step (decide + respond) |
| Complexity | High (sessions, workspaces) | Low (stateless) |
| Learning | Hard to understand | Easy to grasp |

### Files Created
- `src/agent/executor.ts` - Agent executor (160 lines)
- `src/agent/executor.test.ts` - Unit tests (139 lines)
- `src/agent/executor-integration.test.ts` - Integration tests (102 lines)

### Phase 1 Status
✅ Tool system complete
✅ Agent executor complete
⏳ CLI interface (next)

