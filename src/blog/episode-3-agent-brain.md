---
title: "Episode 3: The Agent 'Brain' - Making Decisions with LLM"
date: 2025-02-21
tags: [learning, typescript, ai-agents, llm, decision-making]
episode: 3
---

# Episode 3: The Agent "Brain" - Making Decisions with LLM

## Introduction

In Episode 1, I explained how tools work. In Episode 2, I showed how I built three specific tools. But something needs to decide **when** to use each tool.

That's the Agent Executor - the "brain" of our AI agent.

When I first built this, I was amazed by how simple it is. The executor doesn't actually "know" anything - it just:
1. Receives your message
2. Sends it to the LLM with tool descriptions
3. Detects if the LLM wants to use a tool
4. Executes the tool
5. Returns the result

The intelligence comes from the LLM. The executor is just a coordinator.

**Timeline:** This took me about 4-5 hours, including the regex bug debugging.

## Background

**What I knew before starting:**
- How tools work (from Episode 1)
- That the LLM needs to know about available tools
- That the agent needs to detect when to use tools

**What I wanted to learn:**
- How to build the system prompt
- How to detect tool calls from LLM responses
- How to handle two-phase communication (decision → execution → response)
- Error handling patterns

**What I expected:**
Complex state management and decision logic.

**What I found:**
A straightforward flow with no state - each message is processed independently.

## Deep Dive

### How the Agent "Thinks"

The agent follows a simple two-phase flow:

**Phase 1: Decision**
```
User message → System prompt (with tools) → LLM → Tool call or direct response
```

**Phase 2: Execution (if needed)**
```
Tool call → Execute tool → Result → LLM → Final response to user
```

What's brilliant about this design: **no state needed**. The agent doesn't remember previous messages - it just processes each message independently.

### The Code Structure

Here's the complete flow:

```typescript
async processMessage(message: string): Promise<string> {
  // Step 1: Build system prompt with tool descriptions
  const systemPrompt = this.buildSystemPrompt();

  // Step 2: Send to LLM
  const prompt = `${systemPrompt}\n\nUser: ${message}\nAssistant:`;
  const response = await this.llmClient.sendMessage(prompt);

  // Step 3: Check if LLM wants to use a tool
  const toolCall = this.parseToolCall(response.content);

  if (toolCall) {
    // Phase 2: Execute tool and get final response
    const toolResult = await this.tools.execute(toolCall.name, toolCall.params);

    // Step 4: Send result back to LLM for natural response
    const followUpPrompt = `You just used the ${toolCall.name} tool and got this result: ${JSON.stringify(toolResult)}

Please provide a helpful, natural response to the user's question using this information.
Do NOT mention using a tool or repeat the tool call format. Just answer naturally.

User's question: ${message}`;

    const finalResponse = await this.llmClient.sendMessage(followUpPrompt);
    return finalResponse.content;
  }

  // No tool needed, return direct response
  return response.content;
}
```

**What this taught me:**
- **Simplicity wins** - The entire logic is ~50 lines
- **LLM does the thinking** - The agent just coordinates
- **Two-phase communication** - First decide, then execute, then respond

### Building the System Prompt

The system prompt is how the LLM knows what tools are available:

```typescript
private buildSystemPrompt(): string {
  const toolDescriptions = this.tools
    .list()
    .map((tool) =>
      `- ${tool.name}: ${tool.description}\n  Parameters: ${JSON.stringify(tool.parameters)}`
    )
    .join("\n");

  return `You are a helpful AI assistant with access to the following tools:

${toolDescriptions}

When you need to use a tool, format your response as:
"Using tool: <tool_name> with params: <json_params>"

For example:
"Using tool: echo with params: {"message":"hello"}"

Always explain what you're doing before using a tool.`;
}
```

**What this generates:**

```
You are a helpful AI assistant with access to the following tools:

- echo: Echoes back the message you send. Useful for testing.
  Parameters: {"type":"object","properties":{"message":{"type":"string","description":"The message to echo back"}},"required":["message"]}

- get-time: Returns the current date and time in Beijing timezone (UTC+8)
  Parameters: {"type":"object","properties":{},"required":[]}

When you need to use a tool, format your response as:
"Using tool: <tool_name> with params: <json_params>"
```

**What this taught me:**
1. **JSON Schema is self-documenting** - The parameters describe themselves
2. **Clear examples matter** - The LLM needs to know the exact format
3. **Instructions before capability** - Tell the LLM how to use tools first

### Parsing Tool Calls: The Regex Challenge

This is where things get interesting. The LLM returns text, and we need to detect if it wants to use a tool.

**The format we expect:**
```
Using tool: echo with params: {"message":"hello"}
```

**My first attempt:**
```typescript
const toolPattern = /Using tool:\s*(\w+)\s+with params:\s*(\{.*\})/i;
```

**The bug:** This pattern `\w+` only matches word characters (letters, digits, underscore) but **not hyphens**.

So when the LLM said `"Using tool: get-time with params: {}"`, the regex returned `undefined`.

**The fix:**
```typescript
// Changed \w+ to [\w-]+ to support hyphens
const toolPattern = /Using tool:\s*([\w-]+)\s+with params:\s*(\{.*\})/i;
```

**What this taught me:**
1. **Test regex with real data** - Don't assume patterns work
2. **Tool names can have hyphens** - This is a common convention
3. **Debug logging is essential** - I added `console.log(response.content)` and saw the issue immediately

### Error Handling

What happens when a tool fails?

```typescript
if (toolCall) {
  try {
    const toolResult = await this.tools.execute(toolCall.name, toolCall.params);
    // ... generate final response
  } catch (error) {
    return `Error executing tool ${toolCall.name}: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}
```

**What this taught me:**
- **Graceful degradation** - If a tool fails, the agent doesn't crash
- **Clear error messages** - The user knows what went wrong
- **Type checking** - Always check `error instanceof Error` before accessing `.message`

## Code Walkthrough: A Complete Example

Let's trace a complete conversation using the `get-time` tool from [Episode 2](episode-2-building-tools.md):

**User:** "What time is it?"

**Step 1: Build system prompt**
```
You are a helpful AI assistant with access to the following tools:
- get-time: Returns the current date and time...
```

**Step 2: Send to LLM**
```
User: What time is it?
Assistant:
```

**Step 3: LLM responds**
```
I'll check the current time for you. Using tool: get-time with params: {}
```

**Step 4: Parse tool call**
```typescript
const toolCall = { name: "get-time", params: {} };
```

**Step 5: Execute tool**
```
"2026-02-21T09:45:13.123 (Beijing Time, UTC+8)"
```

**Step 6: Send result back to LLM**
```
You just used the get-time tool and got this result: "2026-02-21T09:45:13.123 (Beijing Time, UTC+8)"

Please provide a helpful, natural response to the user's question using this information.
Do NOT mention using a tool or repeat the tool call format. Just answer naturally.

User's question: What time is it?
```

**Step 7: Final response**
```
It's 9:45 AM on Saturday, February 21st, 2026.
```

**What I found interesting:**
- The agent has no memory - the LLM gets context through prompts
- The tool output is just text - the LLM interprets it
- The "Do NOT mention using a tool" instruction prevents awkward responses like "I used the get-time tool to find out it's 9:45 AM"

## What I Broke: Learning by Doing

### Experiment 1: What if tool name has hyphen?

**The code:**
```typescript
const toolPattern = /Using tool:\s*(\w+)\s+with params:\s*(\{.*\})/i;
```

**What happened:**
```
LLM: "Using tool: get-time with params: {}"
Regex: match = null
Tool call: undefined
Result: Tool not executed
```

**The fix:**
```typescript
const toolPattern = /Using tool:\s*([\w-]+)\s+with params:\s*(\{.*\})/i;
//                            ^^^^^^ Added hyphen support
```

**Lesson:** Test regex with your actual tool names, not made-up examples.

### Experiment 2: What if JSON is invalid?

**The scenario:**
```
LLM: "Using tool: echo with params: {invalid json}"
```

**The code:**
```typescript
try {
  const params = JSON.parse(match[2]);
  return { name, params };
} catch {
  // Invalid JSON, return undefined
  return undefined;
}
```

**What happens:** The tool call is ignored, agent returns the raw LLM response.

**Lesson:** Graceful failure is better than crashing.

### Experiment 3: What if LLM mentions tool but doesn't use format?

**The scenario:**
```
LLM: "I think I should use the get-time tool to answer this."
```

**What happens:** No regex match, agent returns this text directly to user.

**What I learned:** The LLM needs clear instructions. The system prompt shows the exact format.

### Experiment 4: What if tool execution fails?

**The code:**
```typescript
tools.register({
  name: "error-tool",
  execute: async () => {
    throw new Error("Tool execution failed");
  }
});
```

**What happens:**
```typescript
catch (error) {
  return `Error executing tool ${toolCall.name}: ${error instanceof Error ? error.message : "Unknown error"}`;
}
```

**Result:** User sees "Error executing tool error-tool: Tool execution failed"

**Lesson:** Error messages should be informative but safe (don't expose internal details).

## Key Takeaways

After building and studying the agent executor, here's what stuck:

1. **The agent is simple** - It's just ~50 lines of code. The intelligence is in the LLM.

2. **Two-phase communication works** - Decision → Execution → Response. Clean separation of concerns.

3. **No state = simplicity** - Each message is processed independently. No session management needed.

4. **System prompt is crucial** - The LLM needs clear instructions on how to use tools.

5. **Regex is fragile** - Test with real data. My `\w+` assumption broke tool names with hyphens.

6. **Error handling is essential** - Tools can fail. The agent must handle failures gracefully.

7. **The LLM interprets everything** - Tool results are just text. The LLM turns them into natural responses.

## Code Evolution: What Changed

**Initial design:** Complex state machine with conversation history
**Final code:** Stateless function, each message processed independently
**Why?** Simpler. GLM-4.6 is smart enough to understand context from the prompt.

**Initial thought:** Use structured output (JSON mode) for tool calls
**Final code:** Simple regex parsing
**Why?** Text-based format is flexible. Regex works well enough.

**Initial thought:** Tool calls in JSON format
**Final code:** Human-readable format "Using tool: X with params: Y"
**Why?** Easier to debug. The LLM's response is transparent.

## Testing the Agent

**How I tested simple messages:**
```typescript
it("processes simple message without tool call", async () => {
  mockGLMClient.sendMessage.mockResolvedValue({
    content: "Hello! How can I help you today?",
  });

  const response = await executor.processMessage("Hello!");

  expect(response).toBe("Hello! How can I help you today?");
  expect(mockGLMClient.sendMessage).toHaveBeenCalledTimes(1);
});
```

**How I tested tool calls:**
```typescript
it("processes message with tool call", async () => {
  // First call: LLM decides to use tool
  mockGLMClient.sendMessage
    .mockResolvedValueOnce({
      content: 'I\'ll echo that. Using tool: echo with params: {"message":"test"}',
    })
    // Second call: LLM generates final response
    .mockResolvedValueOnce({
      content: 'I echoed "test" for you. The result was: Echo: test',
    });

  const response = await executor.processMessage("Echo 'test' for me");

  expect(response).toContain("test");
  expect(mockGLMClient.sendMessage).toHaveBeenCalledTimes(2);
});
```

**How I tested error handling:**
```typescript
it("handles tool execution errors gracefully", async () => {
  tools.register({
    name: "error-tool",
    execute: async () => {
      throw new Error("Tool execution failed");
    },
  });

  mockGLMClient.sendMessage.mockResolvedValue({
    content: "Using tool: error-tool with params: {}",
  });

  const response = await executor.processMessage("Use the error tool");

  expect(response).toBeDefined(); // Should not throw
});
```

## What Surprised Me

1. **How little code is needed** - The executor is ~50 lines. I expected hundreds.

2. **No conversation memory** - The agent doesn't store previous messages. Each message is standalone.

3. **LLM does all the thinking** - The agent just coordinates. The "intelligence" is entirely from GLM-4.6.

4. **Regex parsing works well** - I expected to need complex parsing. A simple regex is enough.

5. **Two-phase communication is natural** - Decision → Execution → Response feels like how humans think.

6. **The follow-up prompt is crucial** - Without "Do NOT mention using a tool", responses were awkward.

7. **Error handling is simple** - Just try/catch. No complex retry logic needed.

## Real Bugs I Encountered

### Bug #1: The Hyphen in Tool Names

**The Problem:**
When I tested the agent with "What time is it?", the LLM responded "Using tool: get-time with params: {}" but nothing happened. The agent returned the raw text without executing the tool.

**The Investigation:**
I added debug logging:
```typescript
console.log('[DEBUG] LLM Response:', response.content);
// Output: "Using tool: get-time with params: {}"
console.log('[DEBUG] Tool call detected:', this.parseToolCall(response.content));
// Output: undefined
```

The tool call was `undefined`!

**The Bug:**
```typescript
// In executor.ts:
const toolPattern = /Using tool:\s*(\w+)\s+with params:\s*(\{.*\})/i;
```

`\w+` matches word characters but **not hyphens**. So `get-time` wasn't matched.

**The Fix:**
```typescript
const toolPattern = /Using tool:\s*([\w-]+)\s+with params:\s*(\{.*\})/i;
//                            ^^^^^^ Added hyphen to character class
```

**Lesson:** Test regex patterns with your actual data, not hypothetical examples.

**Note:** Episode 1 briefly mentioned this bug, but since it's about the executor (this episode), not the tool system, the full explanation belongs here.

### Bug #2: Awkward "I Used a Tool" Responses

**The Problem:**
When the agent used a tool, the final response was weird:
```
User: What time is it?
Agent: I used the get-time tool and found out it's 9:45 AM.
```

This feels robotic and unnatural.

**The Fix:**
I updated the follow-up prompt:
```typescript
const followUpPrompt = `You just used the ${toolCall.name} tool and got this result: ${JSON.stringify(toolResult)}

Please provide a helpful, natural response to the user's question using this information.
Do NOT mention using a tool or repeat the tool call format. Just answer naturally.

User's question: ${message}`;
```

**After the fix:**
```
User: What time is it?
Agent: It's 9:45 AM on Saturday, February 21st, 2026.
```

**Lesson:** Explicit instructions prevent awkward LLM behavior.

### Bug #3: Empty Tool Parameters

**The Problem:**
When the LLM responded with `Using tool: get-time with params: `, the regex didn't match.

**The Investigation:**
The regex expected `{.*}` which requires at least `{}`.

**The Fix:**
The actual tool had empty parameters, so the LLM learned to format it as `Using tool: get-time with params: {}`. The regex was correct - the LLM just needed to follow the format.

**Lesson:** Show the LLM exact examples in the system prompt.

## Next Steps

Now that we have:
- ✅ Tool system (Episode 1)
- ✅ Built-in tools (Episode 2)
- ✅ Agent executor (Episode 3)

**Episode 4 Preview:** Following a Message Through the Agent - tracing the complete flow from user input to response, including:
- Architecture diagram
- Data transformation at each step
- How all components connect
- What happens when things go wrong

## Resources

- **Code:** `src/agent/executor.ts`
- **Tests:** `src/agent/executor.test.ts`
- **Integration Tests:** `src/agent/executor-integration.test.ts`
- **Episode 1:** [The Tool System](episode-1-tool-system.md)
- **Episode 2:** [Building Tools](episode-2-building-tools.md)

---

**Previous:** [Episode 2: Building Tools] | **Next:** [Episode 4: Message Flow]
