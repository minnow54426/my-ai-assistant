---
title: "Episode 2: Building Tools - From Echo to Beijing Time"
date: 2025-02-21
tags: [learning, typescript, ai-agents, tools, timezone]
episode: 2
---

# Episode 2: Building Tools - From Echo to Beijing Time

## Introduction

In Episode 1, I explained how the tool system works. But knowing the interface is one thing - actually implementing tools is another. Today I'll share how I built three tools: `echo`, `get-time`, and `file-list`.

Each tool taught me something different:
- **echo** - How to keep things simple (and why that matters)
- **get-time** - Dealing with timezones and global considerations
- **file-list** - Working with the file system and handling edge cases

**Timeline:** This took me about 6-8 hours spread over 2 days, including testing and bug fixes.

## Background

**What I knew before starting:**
- Basic TypeScript from Episode 1
- How to use the Tool interface
- What the tools should do conceptually

**What I wanted to learn:**
- How to implement a tool from scratch
- How to handle errors (files not found, etc.)
- How to work with async operations
- Real-world patterns (timezone, file system)

**What I expected:**
Each tool would be straightforward and independent.

**What I found:**
Each tool had unique challenges that taught me different TypeScript patterns. The tools were interconnected in ways I didn't expect.

## Deep Dive

### Tool 1: Echo - Keep It Simple

**Why I started with echo:**
I wanted to start with something simple. A tool that just returns what you give it. Perfect for testing.

**How it works:**

```typescript
export const echoTool: Tool<{ message: string }, string> = {
  name: "echo",
  description: "Echoes back the message you send. Useful for testing.",
  parameters: {
    type: "the object",
    properties: {
      message: {
        type: "string",
        description: "The message to echo back",
      },
    },
    required: ["message"],
  },
  execute: async (params) => {
    return `Echo: ${params.message}`;  // Simple string interpolation
  },
};
```

**What this taught me:**
- **YAGNI in action** - You Are Gonna Need It...eventually. The tool doesn't need validation logic beyond TypeScript's type checking
- **Async by default** - Even though this doesn't do any I/O, it's async to match the interface
- **Simplicity is powerful** - The simpler the code, the easier it is to debug

**My mistake:**
I initially thought about adding input validation (check if message is empty, etc.) but realized: **TypeScript already validates**. If `message` is optional in the schema but required in the type, TypeScript will catch it.

### Tool 2: Get-Time - Timezones Are Hard

**The challenge:**
Show the user the current time in Beijing (UTC+8), not UTC.

**My first attempt (WRONG):**
```typescript
export const getTimeTool: Tool<{}, string> = {
  name: "get-time",
  description: "Returns the current date and time",
  execute: async () => {
    return new Date().toISOString();  // Returns UTC!
  },
};
```

**The problem:**
```
User: What time is it?
Agent: It's 1:41 AM UTC (2026-02-21T01:41:00.000Z)
User (in Beijing): 😕 That's wrong, it's 9:41 AM here!
```

**The fix:**

I had to understand timezone offsets. Beijing is UTC+8, which means it's 8 hours ahead of UTC.

```typescript
export const getTimeTool: Tool<{}, string> = {
  name: "get-time",
  description: "Returns the current date and time in Beijing timezone (UTC+8)",
  execute: async () => {
    const now = new Date();

    // Add 8 hours to convert UTC to Beijing time
    const beijingTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));

    // Format: "2026-02-21T09:41:00.123 (Beijing Time, UTC+8)"
    return beijingTime.toISOString().replace('Z', '') + ' (Beijing Time, UTC+8)';
  },
};
```

**What this taught me:**
1. **Time is tricky** - UTC vs local time is a common source of bugs
2. **Be explicit about timezone** - Always label which timezone you're using
3. **Time zones are offsets** - UTC+8 means "add 8 hours"
4. **Date objects are mutable** - Need to create a new Date object after adding milliseconds

**The interesting part:**
I initially tried to use `new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })` but decided against it. Why? **Simplicity.** Manual offset is clear and has no dependencies on locale data.

### Tool 3: File-List - The Hardest One

**The challenge:**
List all files in a directory, recursively, with optional pattern filtering.

**My first attempt (BROKEN):**
```typescript
export const fileListTool: Tool<{ directory?: string }, { files: string[] }> = {
  name: "file-list",
  description: "Lists files in a directory.",
  execute: async (params) => {
    const targetDir = params.directory || process.cwd();
    const entries = await fs.readdir(targetDir, { withFileTypes: true });

    const files = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name);

    return { files };  // 😕 Only top-level files!
  },
};
```

**The problem:**
```
User: List TypeScript files in src
Agent: I don't see any TypeScript files...directory appears empty
```

**Why it failed:**
The `.ts` files were in subdirectories:
```
src/
├── agent/tools.ts          ← Here!
├── llm/glm.ts             ← And here!
├── cli/chat.ts            ← Also here!
```

My tool only looked at the top level.

**The fix:**

I made it recursive by default:

```typescript
// First, define a recursive function
const getAllFiles = async (dir: string, baseDir: string): Promise<void> => {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);

    if (entry.isDirectory()) {
      // 🔄 Recurse into subdirectories
      await getAllFiles(fullPath, baseDir);
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }
};

// Then use it
await getAllFiles(targetDir, targetDir);
```

**The second problem - Pattern matching:**

When I tried to filter by `*.ts`, it returned nothing!

```typescript
// Pattern: *.ts
const regex = new RegExp(".*\.ts$");
files.filter((file) => regex.test(file));
// Matches: tools.ts ✅
// But NOT: agent/tools.ts ❌
```

**The fix:**

I had to properly convert glob patterns to regex:

```typescript
// Handle different glob patterns:
params.pattern
  .replace(/\./g, '\\.')      // Escape dots
  .replace(/^\*/g, '.*')      // * at start = match any path
  .replace(/([^\\])\*/g, '$1[^/]*')  // * in middle = no slashes
```

So:
- `*.ts` → matches `tools.ts`, `glm.ts` but NOT `agent/tools.ts` (slash)
- `**/*.ts` → matches `agent/tools.ts`, `llm/glm.ts` (any depth)
- `agent/*.ts` → matches `agent/tools.ts` (specific directory)

**What this taught me:**
1. **File systems are hierarchical** - Need to think about directories
2. **Glob patterns are subtle** - `*` means different things in different contexts
3. **Recursion is natural** - Most users expect recursive search by default
4. **Edge cases matter** - What if directory doesn't exist? What if no files match?

## Building the Tool: Step-by-Step

### Step 1: Define the Type Signature

```typescript
// What goes IN? ({ message: string })
// What comes OUT? (string)
export const echoTool: Tool<{ message: string }, string>
```

This tells TypeScript: "This tool requires an object with a `message` property of type string, and returns a string."

### Step 2: Define Parameters

```typescript
parameters: {
  type: "object",
  properties: {
    message: {
      type: "string",
      description: "The message to echo back",
    },
  },
  required: ["message"],  // TypeScript enforces this!
}
```

### Step 3: Implement the Execute Function

```typescript
execute: async (params) => {
  return `Echo: ${params.message}`;  // params.message is type-checked!
}
```

### Step 4: Export and Register

```typescript
export const echoTool: Tool<..., ...> = { ... };

// Later:
tools.register(echoTool);
```

## The Pattern That Emerged

After building all three tools, I noticed a pattern:

```typescript
// 1. Define what goes in, what comes out
// 2. Describe parameters for documentation
// 3. Implement the logic
// 4. Handle errors with try/catch
// 5. Return a consistent structure

export const myTool: Tool<InputType, OutputType> = {
  name: "tool-name",
  description: "What it does",
  parameters: { /* ... */ },
  execute: async (params) => {
    // Logic here
    try {
      // Do the work
      return result;
    } catch (error) {
      throw new Error(`Failed: ${error.message}`);
    }
  },
};
```

## Testing Tools

One thing I learned: **testing tools is different** from testing regular code.

**How I tested echo:**
```typescript
// Test 1: Basic functionality
const result = await tool.execute({ message: "test" });
expect(result).toBe("Echo: test");

// Test 2: Empty message (if not using type system)
// But with TypeScript, this won't even compile!
```

**How I tested file-list:**
```typescript
// Test with actual directory
const result = await tool.execute({ directory: "src" });
expect(result.directory).toBe("src");
expect(result.files).toContain("agent/tools.ts");
expect(result.count).toBeGreaterThan(0);

// Test pattern matching
const result2 = await tool.execute({
  directory: "src",
  pattern: "*.ts"
});
result2.files.forEach((file) => {
  expect(file).toMatch(/\.ts$/);
});
```

**How I tested get-time:**
```typescript
// Test that it returns a timestamp
const result = await tool.execute({});
expect(result).toMatch(/\d{4}-\d{2}-\d{2}T/);
expect(result).toContain("Beijing Time");

// Test that it's recent (within 5 seconds)
const resultDate = new Date(result.match(/\d+/)![0] + 'Z');
const beijingDate = new Date(resultDate.getTime() - (8 * 60 * 60 * 1000));
const diffMs = Math.abs(Date.now() - beijingDate.getTime());
expect(diffMs).toBeLessThan(5000);
```

## What I Broke: Learning by Doing

### Experiment 1: What if directory doesn't exist?

```typescript
await fileListTool.execute({ directory: "/nonexistent" });
```

**Error:** `Failed to list directory: Unknown error`

**What happened:**
The fs.readdir threw an error, but the error message wasn't helpful.

**The fix:**
```typescript
} catch (error) {
  throw new Error(
    `Failed to list directory: ${error instanceof Error ? error.message : "Unknown error"}`
  );
}
```

**Lesson:** Always extract the actual error message!

### Experiment 2: What if pattern is invalid regex?

```typescript
// This would throw
new RegExp("[invalid regex(");
```

**What I learned:**
The tool assumes the pattern is valid. Since the LLM provides the pattern, it's the LLM's job to provide valid patterns. We could add validation, but **YAGNI** - the LLM generates reasonable patterns.

### Experiment 3: What if we call file-list with huge directory?

**What I tested:**
```typescript
// Mock scenario: directory with 10,000 files
```

**What I learned:**
- Could be slow with large directories
- For now, it's fine
- Could add pagination in the future if needed

## Key Takeaways

After building and debugging three tools, here's what stuck:

1. **Start simple** - The echo tool was just 5 lines but taught me the pattern
2. **Timezones are confusing** - Always be explicit about which timezone you're using
3. **Recursion requires care** - Need to track base directory correctly
4. **Pattern matching is subtle** - Test your regex patterns with actual file paths
5. **Error messages matter** - Extract the actual error, don't just say "Unknown error"
6. **TypeScript prevents whole classes of bugs** - I didn't even have to test invalid parameters at runtime

## Code Evolution: What Changed

**Initial file-list tool:**
- Only searched top-level directory
- Simple pattern matching
- No count field

**Final file-list tool:**
- Recursive search by default
- Advanced pattern matching
- Returns count
- Optional `recursive` parameter

**Why the evolution:**
- User feedback: "Why aren't you finding files in subdirectories?"
- Bug reports: "Pattern *.ts isn't working"
- Feature request: "How many files are there?"

Each change made the tool more useful and educational.

## What Surprised Me

1. **Async is natural for tools** - I didn't even think about it. Tools do I/O, so they should be async.

2. **The `pattern` parameter is powerful** - Simple glob patterns enable complex filtering without complex code.

3. **`recursive` should be the default** - Users expect recursive search. Non-recursive is the special case.

4. **Beijing time conversion is just math** - No libraries needed, just add milliseconds.

5. **Testing tools is fun** - Seeing the tool work gives immediate satisfaction. It's not like testing abstract business logic.

## Next Steps

The tools are what the agent CAN do. But something needs to decide WHEN to use each tool.

**Episode 3 Preview:** The Agent Executor - the "brain" that:
- Receives your message
- Sends it to GLM with tool descriptions
- Detects which tool to use
- Executes the tool
- Returns a helpful response

The agent executor is where everything comes together!

## Resources

- **Code:** `src/agent/built-in-tools.ts`
- **Tests:** `src/agent/built-in-tools.test.ts`
- **Episode 1:** [The Tool System - TypeScript Generics Made Simple](episode-1-tool-system.md)

---

**Previous:** [Episode 1: Tool System] | **Next:** [Episode 3: The Agent "Brain"]
