# Agent Learning Plan: Building an AI Assistant from OpenClaw

**Date:** 2025-02-20
**Author:** boycrypt & Claude
**Status:** Approved
**Timeline:** 1-2 weeks

## Overview

This document outlines a learning plan to build a personal AI assistant by studying and adapting OpenClaw's architecture. The goal is to understand how agents work—specifically how they receive messages, decide what to do, and execute tasks at the right time—while learning TypeScript in the process.

## Learning Goals

### Primary Goals
1. **Understand Agent Architecture** - How messages flow through the system, how decisions are made, and how tools are executed
2. **Learn TypeScript** - Hands-on practice with types, interfaces, async/await, and module system
3. **Build a Working Assistant** - Create a practical tool that can execute real tasks

### What Makes OpenClaw Fascinating
- **Automatic decision-making** - Agent understands intent and chooses appropriate tools
- **Right-time execution** - Knows when to take action, not just what to do
- **Task versatility** - Handles system tasks, information retrieval, automation, and creative work

## Approach

**Selected Approach:** Copy-Paste-Understand-Build (Approach A)

**Rationale:**
- Learner has 10+ hours/week for intensive study
- Learns best by: simple example → study how it works → extend it
- Goal is to build a practical assistant (need working code early for motivation)
- Having working reference prevents getting stuck on complex concepts

## Learning Roadmap

### Phase 1: Extract & Run (1-2 days, 4-6 hours)

**Objective:** Get a minimal "Hello World" agent running in the project

#### What We'll Build

A minimal agent demonstrating the core magic:
```
User: "list files in /tmp"
  → Agent receives message
  → Agent asks LLM: "What tool should I use?"
  → LLM responds: "Use the file-list tool"
  → Agent executes file-list tool
  → Agent returns result to user
```

#### Components to Extract

1. **Agent Executor** - Runs the agent process
2. **Tool Registry** - Lists available tools (file-list, echo, etc.)
3. **LLM Client** - Already have GLM client
4. **Message Handler** - Receives and routes messages
5. **Simple CLI** - Interactive chat interface

#### File Structure
```
src/
├── agent/
│   ├── executor.ts      # Runs the agent
│   ├── tools.ts         # Tool definitions & registry
│   └── messages.ts      # Message handling
├── cli/
│   └── chat.ts          # Interactive CLI
└── examples/
    └── agent-demo.ts    # Demo script
```

#### Success Criteria
- Run `npm run chat` and send messages
- Agent executes at least 2 tools (file-list, echo)
- See the decision flow: message → LLM → tool → result

---

### Phase 2: Deep Study (2-3 days, 8-12 hours)

**Objective:** Understand each component deeply using the "Explain Like I'm 5" method

#### Study Framework

For each component, answer:
1. **What** does it do? (one sentence)
2. **Why** does it exist? (what problem does it solve)
3. **How** does it work? (key logic flow)
4. **What happens if I break it?** (experimentation)

#### Component Study Checklists

**Agent Executor**
- How does it spawn a process?
- How does it communicate with the process?
- How does it handle timeouts/errors?
- Difference between sync and async execution

**Tool Registry**
- How are tools defined?
- How does the agent know which tool to call?
- What's a tool signature?
- How are tool results returned?

**Message Handler**
- How are messages parsed?
- How does it extract user intent?
- How does it handle conversation history?
- What's the message format?

**LLM Integration**
- How does the agent decide to call the LLM?
- What prompt does it send?
- How does it parse the LLM response?
- How does it handle tool calls from the LLM?

#### Study Techniques

**Trace a single message through the system:**
- Add console.log at each step
- Watch the data transform
- Document the flow

**Break experiments:**
- What if tool returns error?
- What if LLM doesn't respond?
- What if message is empty?
- What if tool doesn't exist?

#### Deliverable
A diagram or document explaining the architecture in your own words

---

### Phase 3: Rebuild From Scratch (3-4 days, 12-16 hours)

**Objective:** Solidify understanding by rebuilding without looking at reference

#### Day 1: Architecture & Data Structures
- Design file structure
- Define types/interfaces (no looking!)
- Sketch data flow on paper
- Write pseudo-code for each component

#### Days 2-3: Implementation
- Implement without referencing OpenClaw
- If stuck → write TODO, move on
- Use OpenClaw only as LAST resort
- Test each piece independently

#### Day 4: Integration & Testing
- Connect all the pieces
- Run same tests as Phase 1
- Compare behavior with original
- Document differences & lessons learned

#### Rules

**✅ DO:**
- Use TypeScript concepts learned
- Reference Google/StackOverflow for syntax
- Check Phase 2 notes
- Write tests as you go (TDD)

**❌ DON'T:**
- Copy-paste from OpenClaw
- Look at OpenClaw unless totally stuck
- Get bogged down in perfection
- Spend more than 30 min stuck before asking for help

#### Success Criteria
You know you understand it when:
- You can explain each line without looking
- You can modify it to add new features confidently
- You can teach someone else how it works
- The code feels like YOUR code, not copied

---

### Phase 4: Extend & Make It Yours (ongoing)

**Objective:** Build custom features and integrate with your needs

#### Feature Ideas

**Core Agent Features:**
- Multi-step reasoning (chain of thought)
- Memory system (remember conversations)
- Skill loading (add tools dynamically)
- Agent personalities (different behaviors)

**Integrations:**
- Discord bot (token already in config!)
- File system operations (read, write, search)
- Web search & browsing
- Code execution (run scripts safely)

**Advanced LLM Features:**
- Function calling (tool use)
- Streaming responses (real-time)
- Context window management
- Multi-model support (GLM, Claude, GPT)

**Developer Experience:**
- Better CLI interface
- Debug/verbose modes
- Configuration profiles
- Logging & monitoring

#### Learning Strategy

Build → Test → Understand → Document:
1. Pick ONE feature
2. Build simplest version (1-2 hours)
3. Test manually
4. Study why/how it works
5. Write tests
6. Document
7. Pick next feature

#### Project Ideas

**Option A: Personal Dev Assistant**
- Help with coding tasks
- Search docs & StackOverflow
- Run build/test commands
- Manage git operations

**Option B: Automation Bot**
- Schedule tasks
- Send notifications
- Monitor systems
- Generate reports

**Option C: Learning Companion**
- Explain concepts
- Quiz on topics
- Summarize articles
- Track progress

## Current Project State

**Completed:**
- ✅ GLM client (LLM integration)
- ✅ Configuration system
- ✅ Test infrastructure (Jest, tsx)
- ✅ Git repository initialized
- ✅ TypeScript project setup

**Ready for Phase 1:**
- All dependencies installed
- Test framework configured
- GLM API tested and working
- Config system loads from .env

## Success Metrics

### Phase Completion Indicators
- **Phase 1:** Agent responds to messages and executes tools
- **Phase 2:** Can explain architecture without notes
- **Phase 3:** Rebuilt agent works without referencing original
- **Phase 4:** At least 3 custom features implemented

### Overall Success
- Working AI assistant that accepts messages and executes tasks
- Deep understanding of agent architecture
- Comfortable with TypeScript (types, interfaces, async, modules)
- Can extend and modify the system confidently

## Notes

- Learner profile: Some programming experience (knows variables, functions, loops), new to TypeScript and agents
- Learning style: Start with simple example → study how it works → extend it
- Time commitment: 10+ hours per week (intensive)
- Goal: Build practical assistant for daily use

## References

- OpenClaw repository: `/Users/boycrypt/code/typescript/openclaw`
- Current project: `/Users/boycrypt/code/typescript/my-assistant`
- GLM Client implementation: `src/llm/glm.ts`
