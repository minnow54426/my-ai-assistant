# My AI Assistant

A learning project to understand how AI agents work by building a minimal agent from scratch.

## 🎯 Project Overview

This is an AI assistant that can:
- Receive messages from users
- Decide which tool to use (powered by GLM-4.6)
- Execute tools (echo, get-time, file-list)
- Return helpful responses

Built to learn:
- How agents work
- TypeScript
- Test-driven development (TDD)

## ✨ Features

### Current Capabilities
- **Chat Interface** - Interactive CLI for conversations
- **Shared Memory** - All sessions share conversation context
  - Remembers information across sessions
  - Automatic summarization every 20 messages
  - Persists to `data/shared-memory.json`
  - `/stats` command to view memory statistics
  - `/clear` command for memory reset instructions
- **Tool System** - Extensible tool architecture
- **3 Built-in Tools:**
  - `echo` - Echo back messages (for testing)
  - `get-time` - Returns current Beijing time (UTC+8)
  - `file-list` - List files in directories (recursive)

### How It Works
```
Your message → Agent → Shared Memory → GLM (decides tool) → Tool execution → Result → Memory → You
```

All chat sessions share the same memory, allowing the assistant to remember context across multiple sessions.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/minnow54426/my-ai-assistant.git
cd my-ai-assistant

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and add your GLM API key and URL
```

### Configuration

Create a `.env` file in the project root:

```env
GLM_API_KEY=your-glm-api-key
GLM_URL=https://your-glm-api-endpoint/v1/chat/completions
```

### Run the Agent

```bash
# Start interactive chat
npm run chat

# Or run the demo
npx tsx src/examples/test-agent.ts

# Run tests
npm test
```

## 💬 Usage Examples

### Chat with the Agent

```bash
npm run chat
```

Then try:
```
You: What time is it?
Agent: It's 9:45 AM on Saturday, February 21st, 2026 (Beijing Time, UTC+8).

You: Echo hello world
Agent: hello world

You: List TypeScript files in src
Agent: There are 17 TypeScript files in the src directory...
```

### Programmatic Usage

```typescript
import { AgentExecutor } from './agent/executor';
import { GLMClient } from './llm/glm';
import { ToolRegistry } from './tools';
import { echoTool, getTimeTool, fileListTool } from './built-in-tools';
import { MemoryManager } from './memory/memory-manager'; // NEW!

const glmClient = new GLMClient({
  apiKey: process.env.GLM_API_KEY,
  baseURL: process.env.GLM_URL,
  model: 'glm-4.6',
});

const tools = new ToolRegistry();
tools.register(echoTool);
tools.register(getTimeTool);
tools.register(fileListTool);

// Optional: Add shared memory
const memoryManager = new MemoryManager(
  {
    storagePath: 'data/shared-memory.json',
    maxRecentMessages: 15,
    summarizeAfter: 20,
    maxSummaries: 50
  },
  glmClient
);

const agent = new AgentExecutor({
  llmClient: glmClient,
  tools,
  memoryManager  // Optional - for shared memory
});

const response = await agent.processMessage('What time is it?');
console.log(response);
```

## 📁 Project Structure

```
my-assistant/
├── src/
│   ├── agent/              # Agent system
│   │   ├── executor.ts     # Agent "brain" - processes messages
│   │   ├── tools.ts        # Tool interface and registry
│   │   └── built-in-tools.ts  # Built-in tools
│   ├── cli/                # Command-line interface
│   │   └── chat.ts         # Interactive chat CLI
│   ├── llm/                # LLM integration
│   │   └── glm.ts          # GLM API client
│   ├── memory/             # Memory system (NEW!)
│   │   ├── types.ts        # Memory data structures
│   │   └── memory-manager.ts  # Shared memory management
│   ├── config/             # Configuration management
│   └── examples/           # Example scripts
├── docs/plans/             # Learning plan and design docs
├── data/                   # Memory storage (gitignored)
├── .env                    # API keys (not in git)
└── package.json
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- src/agent/tools.test.ts

# Run tests in watch mode
npm run test:watch
```

### Test Coverage
- 61 tests passing (67 total, 6 rate-limited)
- Unit tests for all components
- Integration tests with real GLM API
- Memory system tests (28 tests)
- Memory integration tests (15 tests)

## 🛠️ Built-in Tools

### Echo Tool
Simple testing tool that echoes back the message.

```
User: Echo hello world
Tool Result: Echo: hello world
```

### Get-Time Tool
Returns current Beijing time (UTC+8).

```
User: What time is it?
Tool Result: 2026-02-21T09:45:13 (Beijing Time, UTC+8)
Agent Response: It's 9:45 AM on Saturday, February 21st, 2026.
```

### File-List Tool
Lists files in a directory. Recursive by default.

```
User: How many TypeScript files in src?
Tool Result: { directory: 'src', files: [...], count: 17 }
Agent Response: There are 17 TypeScript files in the src directory.
```

## 🔧 Adding New Tools

Create a new tool in `src/agent/built-in-tools.ts`:

```typescript
import { Tool } from './tools';

export const myTool: Tool<{ param: string }, string> = {
  name: 'my-tool',
  description: 'Does something cool',
  parameters: {
    type: 'object',
    properties: {
      param: {
        type: 'string',
        description: 'A parameter',
      },
    },
    required: ['param'],
  },
  execute: async (params) => {
    // Your tool logic here
    return 'Result';
  },
};
```

Then register it:
```typescript
tools.register(myTool);
```

## 📚 Learning Journey

This project follows a structured learning approach:

### Phase 1: Extract & Run ✅
- Built minimal working agent
- Implemented tool system
- Integrated with GLM API
- **Status:** Complete

### Phase 2: Deep Study ✅
- Understood each component deeply
- Traced message flow
- Documented architecture
- **Status:** Complete

### Phase 3: Rebuild from Scratch ✅
- Solidified understanding
- Built from memory/understanding
- **Status:** Complete

### Phase 4: Conversation & Memory ✅
- Added shared memory system
- Implemented automatic summarization
- Integrated memory into agent
- Added `/stats` and `/clear` CLI commands
- **Status:** Complete

### Phase 5: Streaming Responses (Next)
- Real-time token streaming from LLM
- Typewriter effect in CLI
- **Status:** Pending

See `docs/plans/` for detailed implementation plans.

## 🤝 Contributing

This is a learning project. Feel free to:
- Open issues for questions
- Submit PRs for improvements
- Share your learning journey

## 📝 License

ISC

## 🙏 Acknowledgments

- Inspired by [OpenClaw](https://github.com/iflowstudio/openclaw)
- Built with TypeScript and GLM-4.6
- Learning with TDD

---

**Built with ❤️ to learn how AI agents work**
