---
title: "Episode 1: The Tool System - TypeScript Generics Made Simple"
date: 2025-02-21
tags: [learning, typescript, ai-agents, generics]
episode: 1
---

# Episode 1: The Tool System - TypeScript Generics Made Simple

## Introduction

Today I dove into the tool system - the foundation that gives our AI agent its capabilities. When I started this project, I barely knew TypeScript, and concepts like "generics" seemed intimidating. But after building and testing this system, generics finally clicked for me.

In this episode, I'll break down how the tool system works, why TypeScript generics are so powerful, and what I learned when I tried to break it.

## Background

**What I knew before starting:**
- Basic programming concepts from another language
- JavaScript fundamentals
- What tools were conceptually (functions that do things)

**What I wanted to learn:**
- How to structure tools in TypeScript
- What generics actually are and why they matter
- How to manage a collection of tools
- How to make it type-safe

**What I expected:**
Complex, confusing code with lots of type annotations.

**What I found:**
A simple, elegant system that's actually easier to understand because of TypeScript's type safety.

## Deep Dive

### How It Works

The tool system has two main parts:

**1. The Tool Interface**

Every tool follows this structure:

```typescript
interface Tool<T, R> {
  name: string;
  description: string;
  parameters: ToolParameterSchema;
  execute: (params: T) => Promise<R>;
}
```

Let me break this down in simple terms:

- **`name`**: Just a label like "echo" or "get-time" - how we identify the tool
- **`description`**: Human-readable explanation of what the tool does
- **`parameters`**: A JSON Schema describing what inputs the tool needs
- **`execute`**: The actual function that does the work

The magic part is `<T, R>` - these are **generics**.

**2. The ToolRegistry**

This is a simple manager that keeps track of all available tools:

```typescript
class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  register(tool: Tool): void {
    // Add tool to the Map
  }

  execute(name: string, params: unknown): Promise<unknown> {
    // Find tool and run it
  }
}
```

Think of it like a tool chest - you put tools in it, and later you can ask for a specific tool by name.

### Key Concepts: TypeScript Generics

Before this project, generics scared me. But now I get it!

**Without generics** (what I expected):
```typescript
interface Tool {
  name: string;
  execute: (params: any) => Promise<any>;  // 😕 What type is this?
}
```

**With generics** (what we built):
```typescript
interface Tool<T, R> {
  execute: (params: T) => Promise<R>;  // 😊 Type-safe!
}
```

**Why this matters:**

Generics let us say "This tool takes input of type T and returns type R." TypeScript will then:

1. **Validate the input** - Catch mistakes before code even runs
2. **Know the output type** - Autocomplete works, no surprises
3. **Catch bugs early** - Tests fail if types don't match

**Example:**

```typescript
// Echo tool takes string, returns string
const echoTool: Tool<{ message: string }, string> = {
  execute: async (params) => {
    return `Echo: ${params.message}`;  // ✅ TypeScript knows params.message is a string
  }
};

// File list tool takes config, returns file list
const fileListTool: Tool<{ directory: string }, { files: string[] }> = {
  execute: async (params) => {
    const files = await fs.readdir(params.directory);  // ✅ TypeScript knows params.directory exists
    return { files };
  }
};
```

TypeScript prevents mistakes like:
- Calling `execute({ wrongParam: 5 })` - "Property 'message' is missing"
- Forgetting required parameters - caught before runtime
- Returning wrong type - "Type 'string' is not assignable to type '{ files: string[] }'"

### Code Walkthrough

Let's trace how a tool is used:

```typescript
// Step 1: Create a registry
const tools = new ToolRegistry();

// Step 2: Define a tool with types
const echoTool: Tool<{ message: string }, string> = {
  name: "echo",
  description: "Echoes back the message",
  parameters: {
    type: "object",
    properties: {
      message: { type: "string", description: "The message to echo back" }
    },
    required: ["message"]
  },
  execute: async (params) => {
    return `Echo: ${params.message}`;
  }
};

// Step 3: Register it
tools.register(echoTool);

// Step 4: Execute it (type-safe!)
const result = await tools.execute("echo", { message: "Hello" });
// TypeScript knows result is a string here! ✅
```

The generics flow:
1. `tools.execute("echo", { message: "Hello" })`
2. TypeScript looks up echo tool: `Tool<{ message: string }, string>`
3. TypeScript checks `{ message: "Hello" }` matches `{ message: string }`
4. TypeScript knows the return type is `string`
5. Autocomplete works! Bugs prevented!

## What I Broke: Learning by Doing

They say "you learn more from mistakes than successes." So I tried to break the tool system in different ways. Here's what happened:

### Experiment 1: What if tool has no name?

```typescript
const badTool: Tool<{}, string> = {
  name: "",  // Empty name
  description: "Bad tool",
  parameters: { type: "object", properties: {}, required: [] },
  execute: async () => "result"
};

tools.register(badTool);  // ✅ This works!
```

**What I learned:** The system doesn't validate tool names. Should it? Maybe, but for now it's fine - empty names would just be confusing to use.

### Experiment 2: What if duplicate tool names?

```typescript
const tool1: Tool<{}, string> = {
  name: "duplicate",
  description: "First tool",
  parameters: { type: "object", properties: {}, required: [] },
  execute: async () => "result1"
};

const tool2: Tool<{}, string> = {
  name: "duplicate",  // Same name
  description: "Second tool",
  parameters: { type: "object", properties: {}, required: [] },
  execute: async () => "result2"
};

tools.register(tool1);
tools.register(tool2);  // ❌ Throws error!
```

**Error:** `Tool already registered: duplicate`

**What I learned:** The registry protects against duplicates. This is good! It prevents accidentally overwriting tools. The error message is clear and helpful.

### Experiment 3: What if I pass wrong parameters?

```typescript
const echoTool: Tool<{ message: string }, string> = {
  execute: async (params) => `Echo: ${params.message}`
};

tools.register(echoTool);

// Try to call with wrong params
await tools.execute("echo", { wrongField: "test" });
```

**What happened:** TypeScript shows a red squiggly even before I run the code!

**Error:** `Property 'message' is missing in type '{ wrongField: string }' but required in type '{ message: string }'`

**What I learned:** Generics catch bugs **at compile time**, not at runtime. This is huge! I can't accidentally pass wrong parameters - TypeScript stops me before the code even runs.

### Experiment 4: What if tool doesn't exist?

```typescript
await tools.execute("non-existent", {});
```

**Error:** `Tool not found: non-existent`

**What I learned:** The registry throws a clear error when a tool doesn't exist. This makes debugging easy - I immediately know the problem.

## Key Takeaways

After breaking and studying the tool system, here's what stuck:

1. **Generics aren't scary** - They're just placeholders for types. Think: "This takes type T, returns type R" - simple as that.

2. **Type safety prevents bugs** - I can't pass wrong parameters or misinterpret return values. TypeScript catches mistakes before I even run the code.

3. **The Map is perfect for registries** - Using a Map to store tools is simple and efficient. Built-in methods like `has()`, `get()`, and `set()` do everything we need.

4. **Async tools are natural** - All tools are async (`execute: async (params) => Promise<R>`). This makes sense because tools might do I/O operations (like reading files).

5. **Simple structure works** - The tool interface only has 4 fields, but it's powerful enough for anything we need. YAGNI (You Aren't Gonna Need It) - keep it simple!

## Code Evolution: What Changed from Initial Design

**First thought:** Use TypeBox for schema validation (like OpenClaw does)
**Final code:** Simple JSON Schema object
**Why?** TypeBox was overkill for what we need. Simple JSON Schema is enough.

**First thought:** Complex tool validation
**Final code:** Just check if tool name already exists
**Why?** Keep it simple. The agent is responsible for using tools correctly.

**First thought:** Separate validation logic
**Final code:** Let TypeScript handle it
**Why?** TypeScript's type system already validates. No need to duplicate effort.

## What Surprised Me

1. **How simple the registry is** - It's just a Map! No complex logic needed.

2. **TypeScript generics make sense now** - I used to think they were complex, but they're just type placeholders.

3. **The tests were easy to write** - Because the types are clear, I knew exactly what to test.

4. **Async is default** - Everything is async. This feels natural for I/O operations.

5. **TDD actually worked** - Writing tests first helped me understand the interface before implementing.

## Next Steps

The tool system is the foundation - it defines what our agent CAN do. But something needs to decide WHEN to use each tool.

**Coming in Episode 2:** I'll dive into the three tools I built (echo, get-time, file-list), including:
- How I made get-time work for Beijing timezone
- The bug in file-list pattern matching
- What I learned about error handling

**Episode 3 Preview:** Then we'll look at the Agent Executor - the "brain" that decides which tool to use and how to communicate with the GLM API.

## Resources

- **Code:** `src/agent/tools.ts`
- **Tests:** `src/agent/tools.test.ts`
- **Design Doc:** `docs/plans/2025-02-20-agent-learning-plan.md`

---

**Previous:** [Introduction] | **Next:** [Episode 2: Building Tools]
