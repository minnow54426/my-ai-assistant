# Phase 3: Solidify Foundation - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the entire my-assistant system from memory/understanding to prove deep knowledge and solidify the foundation before adding new features.

**Architecture:** Recreate the minimal agent architecture (tools, executor, GLM client) from scratch without looking at original code, using tests as specification of expected behavior.

**Tech Stack:** TypeScript, Node.js, Jest, node-fetch, dotenv

---

## Pre-Tasks: Setup

### Task 0: Backup and Prepare Workspace

**Files:**
- Backup: All existing source files to `phase1-code-backup/`
- Keep: All test files (specification for rebuild)
- Keep: `.env` and config files
- Keep: Blog episodes (reference)

**Step 1: Create backup directory**

```bash
mkdir -p phase1-code-backup
```

Run: `ls -d phase1-code-backup`
Expected: Directory exists

**Step 2: Backup source code (not tests)**

```bash
mkdir -p phase1-code-backup/src/agent
mkdir -p phase1-code-backup/src/llm
mkdir -p phase1-code-backup/src/config
mkdir -p phase1-code-backup/src/cli

cp src/agent/*.ts phase1-code-backup/src/agent/
cp src/llm/*.ts phase1-code-backup/src/llm/
cp src/config/*.ts phase1-code-backup/src/config/
cp src/cli/*.ts phase1-code-backup/src/cli/
```

Run: `ls phase1-code-backup/src/agent/*.ts | wc -l`
Expected: 4 files (tools.ts, built-in-tools.ts, executor.ts, executor-integration.test.ts is backup, don't copy tests)

Wait - correct the backup to exclude test files:

```bash
# Only backup .ts files that are NOT test files
find src -name "*.ts" ! -name "*.test.ts" -exec cp --parents {} phase1-code-backup/ \;
```

**Step 3: Verify backup**

```bash
ls -la phase1-code-backup/src/
```

Expected: agent/, llm/, config/, cli/ directories with .ts files

**Step 4: Commit backup**

```bash
git add phase1-code-backup/
git commit -m "backup: Phase 1 code before Phase 3 rebuild"
```

---

## Task 1: Rebuild Tool System

**Files:**
- Create: `src/agent/tools.ts`
- Reference: `src/agent/tools.test.ts` (test specifications)
- Reference: `src/blog/episode-1-tool-system.md` (understanding from blog)

**Step 1: Delete existing tool system**

```bash
rm src/agent/tools.ts
```

Run: `ls src/agent/tools.ts`
Expected: No such file or directory

**Step 2: Write the failing test - Tool interface**

Skip - tests already exist as specification

**Step 3: Rebuild Tool interface from memory**

Create `src/agent/tools.ts` with:
- `ToolParameterSchema` type (JSON Schema for tool parameters)
- `Tool<T, R>` interface with:
  - `name: string`
  - `description: string`
  - `parameters: ToolParameterSchema`
  - `execute: (params: T) => Promise<R>`

**Key concepts to include:**
- Generics `<T, R>` for type-safe tool input/output
- `execute` is async (returns Promise<R>)

**Step 4: Rebuild ToolRegistry class from memory**

Add to `src/agent/tools.ts`:
- `private tools: Map<string, Tool>`
- `register<T, R>(tool: Tool<T, R>): void` - throws if duplicate name
- `get(name: string): Tool | undefined`
- `execute<T, R>(name: string, params: T): Promise<R>` - gets tool and executes
- `list(): Tool[]` - returns all tools
- `listNames(): string[]` - returns tool names

**Step 5: Run tests to verify implementation**

```bash
npm test src/agent/tools.test.ts
```

Expected: All 9 tests pass

**Step 6: If tests fail, fix issues**

Run tests individually:
```bash
npm test src/agent/tools.test.ts --verbose
```

Fix any failing tests by referring to test expectations (not backed-up code!)

**Step 7: Compare with backup**

```bash
diff -u phase1-code-backup/src/agent/tools.ts src/agent/tools.ts
```

Document differences in `findings.md`

**Step 8: Commit**

```bash
git add src/agent/tools.ts
git commit -m "phase3: rebuild tool system from memory"
```

---

## Task 2: Rebuild Built-in Tools

**Files:**
- Create: `src/agent/built-in-tools.ts`
- Reference: `src/agent/built-in-tools.test.ts`
- Reference: `src/blog/episode-2-building-tools.md`

**Step 1: Delete existing tools**

```bash
rm src/agent/built-in-tools.ts
```

**Step 2: Rebuild echo tool from memory**

Create `src/agent/built-in-tools.ts` with `echoTool`:
- Type: `Tool<{ message: string }, string>`
- Returns: `Echo: ${params.message}`

**Step 3: Rebuild get-time tool from memory**

Add `getTimeTool`:
- Type: `Tool<{}, string>`
- Returns Beijing time (UTC+8)
- Format: `"2026-02-21T09:45:13.123 (Beijing Time, UTC+8)"`
- Calculation: `new Date(now.getTime() + (8 * 60 * 60 * 1000))`

**Step 4: Rebuild file-list tool from memory**

Add `fileListTool`:
- Type: `Tool<{ directory?: string; pattern?: string; recursive?: boolean }, { directory: string; files: string[]; count: number }>`
- Recursive search by default
- Pattern matching with glob-to-regex conversion
- Returns directory, files array, and count

**Key implementation details from Episode 2:**
- Recursive function `getAllFiles(dir, baseDir)`
- Pattern conversion: escape dots, handle `*` at start vs middle
- Use `fs.readdir` with `withFileTypes: true`

**Step 5: Run tests**

```bash
npm test src/agent/built-in-tools.test.ts
```

Expected: All 8 tests pass

**Step 6: Fix any failures**

Refer to test expectations only, not backup code!

**Step 7: Compare with backup**

```bash
diff -u phase1-code-backup/src/agent/built-in-tools.ts src/agent/built-in-tools.ts
```

Document differences

**Step 8: Commit**

```bash
git add src/agent/built-in-tools.ts
git commit -m "phase3: rebuild built-in tools from memory"
```

---

## Task 3: Rebuild GLM Client

**Files:**
- Create: `src/llm/glm.ts`
- Reference: `src/llm/glm.test.ts`
- Reference: `src/blog/episode-5-llm-integration.md`

**Step 1: Delete existing client**

```bash
rm src/llm/glm.ts
```

**Step 2: Rebuild interfaces from memory**

Create `src/llm/glm.ts` with:
- `GLMClientConfig` interface (apiKey, baseURL, model)
- `GLMMessageResponse` interface (content)
- Internal types: `GLMMessage`, `GLMRequestBody`, `GLMErrorResponse`, `GLMSuccessResponse`, `GLMResponse` (union type)

**Step 3: Rebuild GLMClient class from memory**

Add `GLMClient` class with:
- Constructor with validation (throws if apiKey or baseURL missing)
- Private fields: apiKey, baseURL, model
- `async sendMessage(message: string): Promise<GLMMessageResponse>`

**sendMessage implementation details from Episode 5:**
- Build request body with model and messages array
- POST to baseURL using fetch
- Headers: Content-Type, Authorization (Bearer token)
- Check HTTP errors (!response.ok)
- Parse JSON response
- Check custom error format (status field !== "200")
- Check success format (choices array)
- Return content

**Key error handling:**
- HTTP errors (4xx, 5xx status codes)
- Application errors (HTTP 200 with error body)
- Unexpected format (throws error)

**Step 4: Run tests**

```bash
npm test src/llm/glm.test.ts
```

Expected: 6 tests pass

**Step 5: Run integration test**

```bash
npm test src/llm/glm-integration.test.ts
```

Expected: Integration test passes (real GLM API call)

**Step 6: Compare with backup**

```bash
diff -u phase1-code-backup/src/llm/glm.ts src/llm/glm.ts
```

Document differences

**Step 7: Commit**

```bash
git add src/llm/glm.ts
git commit -m "phase3: rebuild GLM client from memory"
```

---

## Task 4: Rebuild Agent Executor

**Files:**
- Create: `src/agent/executor.ts`
- Reference: `src/agent/executor.test.ts`
- Reference: `src/blog/episode-3-agent-brain.md`

**Step 1: Delete existing executor**

```bash
rm src/agent/executor.ts
```

**Step 2: Rebuild interfaces from memory**

Create `src/agent/executor.ts` with:
- `AgentExecutorConfig` interface (llmClient, tools)
- `ToolCall` type (name, params)

**Step 3: Rebuild AgentExecutor class from memory**

Add `AgentExecutor` class with:
- Constructor storing llmClient and tools
- `async processMessage(message: string): Promise<string>`
- `private buildSystemPrompt(): string`
- `private parseToolCall(response: string): { name: string; params: Record<string, unknown> } | undefined`

**processMessage implementation from Episode 3:**
- Build system prompt with tool descriptions
- Send to LLM
- Parse tool call with regex: `/Using tool:\s*([\w-]+)\s+with params:\s*(\{.*\})/i` (note hyphen support!)
- If tool call: execute tool, send follow-up prompt
- If no tool call: return direct response

**Follow-up prompt pattern:**
```typescript
`You just used the ${toolCall.name} tool and got this result: ${JSON.stringify(toolResult)}

Please provide a helpful, natural response to the user's question using this information.
Do NOT mention using a tool or repeat the tool call format. Just answer naturally.

User's question: ${message}`
```

**Error handling:**
- Wrap tool execution in try/catch
- Return error message if tool fails

**Step 4: Run unit tests**

```bash
npm test src/agent/executor.test.ts
```

Expected: 8 tests pass

**Step 5: Run integration tests**

```bash
npm test src/agent/executor-integration.test.ts
```

Expected: All 5 integration tests pass

**Step 6: Test end-to-end manually**

```bash
npm run chat
```

Test:
- Simple message: "Hello"
- Echo tool: "Echo hello world"
- Get time: "What time is it?"
- File list: "List TypeScript files in src"

Expected: All work correctly

**Step 7: Compare with backup**

```bash
diff -u phase1-code-backup/src/agent/executor.ts src/agent/executor.ts
```

Document differences

**Step 8: Commit**

```bash
git add src/agent/executor.ts
git commit -m "phase3: rebuild agent executor from memory"
```

---

## Task 5: Verify All Tests Pass

**Files:**
- Test: All test files

**Step 1: Run full test suite**

```bash
npm test
```

Expected: All 36 tests pass

**Step 2: Check test coverage**

```bash
npm test -- --coverage
```

Expected: High coverage on rebuilt files

**Step 3: If any tests fail**

Debug by running individual test files:
```bash
npm test <test-file> --verbose
```

Fix failures by referring to test expectations

**Step 4: Final commit if needed**

```bash
git add -A
git commit -m "phase3: fix test failures from rebuild"
```

---

## Task 6: Write Comparison Blog Episode

**Files:**
- Create: `src/blog/episode-7-rebuilding-from-scratch.md`

**Step 1: Write blog post with sections:**

1. **Introduction**
   - Why rebuild from scratch?
   - Feynman technique: teaching reinforces learning

2. **Background**
   - What I knew before: 6 blog episodes explaining the system
   - What I wanted to prove: Can I rebuild without looking?
   - Timeline: 1-2 days

3. **The Rebuild Experience**

   **Tool System:**
   - How easy/difficult was it?
   - What did I remember correctly?
   - What did I forget or get wrong?
   - Differences from original (if any)

   **Built-in Tools:**
   - echo: Simple or challenging?
   - get-time: Remembered Beijing time offset?
   - file-list: Remembered recursive algorithm?
   - Pattern matching details

   **GLM Client:**
   - Remembered the two-level error handling?
   - Remembered type guards?
   - Custom error format (status field)

   **Agent Executor:**
   - Remembered regex pattern with hyphen support?
   - Remembered follow-up prompt pattern?
   - Two-phase flow

4. **What I Forgot / What Surprised Me**

   Details:
   - Which interface method names I blanked on
   - Which implementation details I got wrong
   - What the tests caught that I missed
   - "aha!" moments during rebuild

5. **Comparison with Original**

   Create comparison table:

   | Component | Original LOC | Rebuild LOC | Differences | Quality |
   |-----------|--------------|-------------|------------|---------|
   | Tool System | ~110 | ~110 | None/Simpler | Same |
   | Built-in Tools | ~200 | ~200 | None/Simpler | Same |
   | GLM Client | ~200 | ~200 | None/Simpler | Same |
   | Agent Executor | ~160 | ~160 | None/Simpler | Same |

6. **Key Takeaways**

   What I learned from rebuilding:
   - The architecture is solid (could rebuild from memory)
   - Blog episodes captured essential knowledge
   - Tests are excellent specifications
   - TypeScript generics make sense now
   - Simple patterns are easy to remember

7. **Next Steps**

   Preview Phase 4 (Conversation & Memory)

8. **Resources**

   - Backup code: `phase1-code-backup/`
   - Tests: `src/agent/*.test.ts`, `src/llm/*.test.ts`
   - Previous episodes: 1-6

**Step 2: Review and revise**

Read through and ensure:
- Honest reflection about what was hard/easy
- Actual differences documented
- Learning highlights captured

**Step 3: Commit blog episode**

```bash
git add src/blog/episode-7-rebuilding-from-scratch.md
git commit -m "phase3: add blog episode 7 - rebuilding from scratch"
```

---

## Task 7: Final Verification

**Files:**
- All source files
- All test files

**Step 1: Verify all source files rebuilt**

```bash
ls -1 src/agent/*.ts src/llm/*.ts src/config/*.ts src/cli/*.ts
```

Expected: All .ts files present (not .test.ts files)

**Step 2: Run full test suite one more time**

```bash
npm test
```

Expected: 36/36 tests pass

**Step 3: Test chat CLI manually**

```bash
npm run chat
```

Test each tool:
```
> Echo hello world
> What time is it?
> List TypeScript files in src
> Echo test
```

Expected: All work correctly

**Step 4: Check git status**

```bash
git status
```

Expected: Clean (all changes committed)

**Step 5: Create Phase 3 summary**

Create `docs/phases/phase3-summary.md` with:
- Timeline (actual time spent)
- What was easy
- What was hard
- What was forgotten
- Differences from original
- Lessons learned

**Step 6: Commit final summary**

```bash
git add docs/phases/phase3-summary.md
git commit -m "phase3: add rebuild summary and lessons learned"
```

---

## Task 8: Update Planning Documents

**Files:**
- Modify: `task_plan.md`
- Modify: `progress.md`

**Step 1: Update task_plan.md**

Mark Phase 3 complete:
```markdown
### Phase 3: Rebuild from Scratch ✅
- [x] Delete source code (backup created)
- [x] Rebuild tool system from memory
- [x] Rebuilt built-in tools from memory
- [x] Rebuild GLM client from memory
- [x] Rebuild agent executor from memory
- [x] All tests pass
- [x] Comparison with original
- [x] Blog episode 7 written
- **Status:** complete
```

**Step 2: Update progress.md**

Add session log for Phase 3 with:
- Timeline (actual hours/days)
- Components rebuilt
- Test results
- Lessons learned
- Differences from original

**Step 3: Commit updates**

```bash
git add task_plan.md progress.md
git commit -m "phase3: update planning documents - phase complete"
```

---

## Success Criteria Verification

**Step 1: Verify all success criteria**

- [x] Can rebuild without looking at original code
- [x] Understand every design decision
- [x] Simpler or equal complexity
- [x] Tests pass (36/36)

**Step 2: Create Phase 3 readiness checklist for Phase 4**

Before starting Phase 4, ensure:
- [ ] Source code is clean (no temporary files)
- [ ] All tests pass
- [ ] Documentation is up to date
- [ ] Ready to add new features on solid foundation

**Step 3: Final commit**

```bash
git add -A
git commit -m "phase3: complete - solidify foundation"
```

---

## Notes for Implementation

### Do's and Don'ts

**DO:**
- Use tests as specification (they describe expected behavior)
- Refer to blog episodes when stuck (they contain understanding)
- Check backup code only as last resort (to compare, not copy)
- Document what you forgot in findings.md
- Commit frequently (each component, then tests, then blog)
- Be honest about what was hard/easy in blog post

**DON'T:**
- Look at backup code while rebuilding (defeats the purpose!)
- Copy from backup (rebuild from memory!)
- Skip tests to "save time" (tests prove you understand)
- Move forward if tests fail (fix first, then continue)
- Rush the process (take full 1-2 days, do it right)

### Key References

**Test Files (Specification):**
- `src/agent/tools.test.ts` - Tool system behavior
- `src/agent/built-in-tools.test.ts` - Tool implementations
- `src/agent/executor.test.ts` - Executor logic
- `src/agent/executor-integration.test.ts` - End-to-end behavior
- `src/llm/glm.test.ts` - GLM client behavior
- `src/llm/glm-integration.test.ts` - Real API calls

**Blog Episodes (Understanding):**
- Episode 1: Tool System
- Episode 2: Building Tools
- Episode 3: Agent "Brain"
- Episode 4: Message Flow
- Episode 5: LLM Integration
- Episode 6: Summary

**Backup Code (Compare Only):**
- `phase1-code-backup/src/` - Original implementation (for comparison AFTER rebuild)

### Troubleshooting

**If you can't remember something:**

1. **Check the tests first** - Test assertions describe expected behavior
2. **Read blog episodes** - They contain your understanding
3. **Think about the purpose** - What is this component supposed to do?
4. **Take a break** - Sleep on it, come back fresh
5. **Only then** - Check backup code to see what you forgot

**Document what you couldn't remember** in findings.md - this reveals gaps in understanding!

### Expected Timeline

- **Task 0:** 15 minutes (backup)
- **Task 1:** 1-2 hours (tool system)
- **Task 2:** 1-2 hours (built-in tools)
- **Task 3:** 1-2 hours (GLM client)
- **Task 4:** 1-2 hours (executor)
- **Task 5:** 30 minutes (test verification)
- **Task 6:** 2-3 hours (blog episode)
- **Task 7:** 30 minutes (final verification)
- **Task 8:** 30 minutes (documentation updates)

**Total:** 7-11 hours (1-2 days at comfortable pace)

---

**Plan complete and saved to:** `docs/plans/YYYY-MM-DD-phase3-implementation.md`

Ready for execution!
