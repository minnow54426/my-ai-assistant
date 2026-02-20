# Task Plan: Phase 1 - Extract & Run Minimal Agent

## Goal
Extract a minimal working agent from OpenClaw that can receive messages, decide what to do, and execute tools using the GLM API.

## Current Phase
Phase 1: Extract & Run Minimal Agent

## Phases

### Phase 1: Extract Core Components from OpenClaw
- [ ] Explore OpenClaw's agent execution system
- [ ] Identify minimal components needed (executor, tools, message handler, CLI)
- [ ] Copy relevant code to my-assistant project
- [ ] Adapt to use GLM client instead of OpenAI/Anthropic
- [ ] Create simple CLI interface for testing
- [ ] Test end-to-end: message → LLM → tool → result
- **Status:** pending

### Phase 2: Study & Understand Components
- [ ] Document each component's purpose (what, why, how)
- [ ] Trace message flow through the system
- [ ] Experiment with breaking each component
- [ ] Create architecture diagram
- **Status:** pending

### Phase 3: Rebuild from Scratch
- [ ] Delete copied code
- [ ] Rebuild each component from understanding
- [ ] Use OpenClaw only as last resort
- [ ] Verify rebuilt version works the same
- **Status:** pending

### Phase 4: Extend with Custom Features
- [ ] Add Discord bot integration
- [ ] Add custom tools
- [ ] Improve CLI interface
- **Status:** pending

## Key Questions
1. What's the minimal set of components needed for a working agent?
2. How does OpenClaw decide which tool to use?
3. How should we adapt the LLM integration to use GLM instead of OpenAI?
4. What's the simplest way to test the agent works?

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Start with minimal agent | Learn core concepts before complexity |
| Use GLM client | Already have it working |
| Extract before understanding | Need working code to study |
| Build simple CLI first | Easiest way to test interactively |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| | 1 | |

## Notes
- Focus on understanding the agent "brain" - message → decision → action
- Don't get bogged down in OpenClaw's complexity - extract minimal pieces
- Keep everything simple and well-documented
- Test each component before moving to the next
