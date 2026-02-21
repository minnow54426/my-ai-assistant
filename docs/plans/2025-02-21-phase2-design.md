# Phase 2 Design: Blog-Driven Deep Study

**Date:** 2025-02-21
**Author:** boycrypt & Claude
**Status:** Approved

## Overview

Phase 2 is about deeply understanding each component by writing blog posts. The act of teaching through writing solidifies understanding (the Feynman technique). Each blog post becomes both learning documentation and portfolio content.

**Goal:** Understand each component deeply enough to rebuild from scratch in Phase 3

**Deliverables:**
- 6 blog posts (markdown in `src/blog/`)
- Architecture diagram
- Updated findings.md and progress.md
- Phase 3 readiness checklist

---

## Blog Posts Schedule

### Day 1-2: Tool System

**Episode 1: The Tool System - TypeScript Generics Made Simple**
- File: `src/blog/episode-1-tool-system.md`
- Component: `src/agent/tools.ts`
- Topics:
  - Tool interface and generics
  - ToolRegistry with Map
  - Type safety benefits
- Experiments:
  - Register tool without name
  - Duplicate tool names
  - Invalid tool calls

**Episode 2: Building Tools - From Echo to File List**
- File: `src/blog/episode-2-building-tools.md`
- Component: `src/agent/built-in-tools.ts`
- Topics:
  - Tool implementation patterns
  - Beijing time conversion
  - Recursive file listing
  - Pattern matching with regex
- Experiments:
  - Tool error handling
  - Non-existent directories
  - Edge cases in pattern matching

---

### Day 3: Agent Executor

**Episode 3: The Agent "Brain" - Making Decisions with LLM**
- File: `src/blog/episode-3-agent-brain.md`
- Component: `src/agent/executor.ts`
- Topics:
  - Message processing flow
  - System prompt construction
  - Tool call parsing (regex bug story)
  - Follow-up prompt strategy
- Experiments:
  - Invalid JSON in tool call
  - Tool execution failures
  - No tool call detected

---

### Day 4: Message Flow & Architecture

**Episode 4: Following a Message Through the Agent**
- File: `src/blog/episode-4-message-flow.md`
- Components: All integration
- Topics:
  - End-to-end flow diagram
  - Data transformation at each step
  - LLM interaction pattern
- Experiments:
  - Empty messages
  - LLM timeouts
  - Multiple tools in one message
- Deliverables:
  - Architecture diagram (mermaid or similar)

---

### Day 5: LLM Integration

**Episode 5: Connecting to GLM - APIs, Prompts, and Parsing**
- File: `src/blog/episode-5-llm-integration.md`
- Component: `src/llm/glm.ts`
- Topics:
  - GLM API client implementation
  - Error handling strategies
  - Beijing time conversion (UTC+8)
  - Type-safe response parsing
- Experiments:
  - Wrong API key
  - API error responses
  - Timeout handling
  - Custom base URL support

---

### Day 6: Summary & Architecture

**Episode 6: Building an AI Agent - What I Learned**
- File: `src/blog/episode-6-summary.md`
- Topics:
  - Complete architecture overview
  - Key lessons from all components
  - TDD benefits
  - TypeScript learnings
  - Preparation for Phase 3
- Deliverables:
  - Complete architecture diagram
  - Phase 3 readiness checklist

---

## Working Process

For each component:

1. **Explore** (30-60 min)
   - Read the code
   - Run tests
   - Check usage patterns

2. **Trace & Break** (60-90 min)
   - Add debug logging
   - Change values and test
   - Document what breaks

3. **Write Blog Post** (90-120 min)
   - Follow template
   - Include code snippets
   - Add personal voice

4. **Get Review** (15-30 min)
   - Request review from Claude
   - Revise based on feedback

5. **Update Documentation**
   - Add to findings.md
   - Update progress.md

**Daily Commitment:** 3-4 hours per component

---

## Blog Post Template

```markdown
---
title: "Episode X: [Title]"
date: 2025-02-21
tags: [learning, typescript, ai-agents]
episode: X
---

# Episode X: [Component Name] - [Catchy Title]

## Introduction
[What we're studying, why it matters, expectations]

## Background
[What I knew before, what I wanted to learn]

## Deep Dive

### How It Works
[Simple explanation with code snippets]

### Key Concepts
[TypeScript features, patterns]

### Code Walkthrough
[Annotated examples]

## What I Broke: Learning by Doing

### Experiment 1: [Name]
**What I tried:** [...]
**What happened:** [...]
**What I learned:** [...]

## Key Takeaways
- [Point 1]
- [Point 2]
- [Point 3]

## Next Steps
[Coming up next]

## Resources
[Useful links]

---
**Previous:** [Episode X-1] | **Next:** [Episode X+1]
```

---

## Success Criteria

Phase 2 is complete when:
- [ ] All 6 blog posts written and reviewed
- [ ] Can explain each component without looking at code
- [ ] Architecture diagram created
- [ ] findings.md updated with deep insights
- [ ] progress.md documents all experiments
- [ ] Feel confident to rebuild in Phase 3

---

## Key Principles

1. **Teach to Learn** - Explaining solidifies understanding
2. **Be Honest** - Share mistakes and what you learned
3. **Be Curious** - Ask "what if" and break things
4. **Document Everything** - Your future self will thank you
5. **Have Fun** - Learning should be enjoyable

---

## Phase 3 Preparation

By the end of Phase 2, you should be able to:
- Describe the tool system without looking
- Explain how the agent decides which tool to use
- Draw the architecture from memory
- List all key TypeScript concepts used
- Identify what you'd improve

This prepares you to rebuild everything from scratch in Phase 3.
