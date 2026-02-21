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

## To Investigate
- [ ] How does the agent decide which tool to call?
- [ ] What's the minimal prompt format needed?
- [ ] How are tool results returned to the LLM?
- [ ] What's the simplest agent configuration?
