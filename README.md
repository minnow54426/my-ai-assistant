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
- **Semantic Memory System** - OpenClaw-style retrieval-augmented memory
  - File-based storage: `MEMORY.md` for long-term knowledge
  - Daily logs: `memory/YYYY-MM-DD.md` for temporary notes
  - Hybrid search: Vector embeddings (0.7) + keyword search (0.3)
  - Advanced features: MMR re-ranking, temporal decay (30-day half-life)
  - Embedding cache to avoid re-computation
  - Workspace: `~/.my-assistant/`
- **Tool System** - Extensible tool architecture
  - Agent can search memory and retrieve relevant context
  - 5 Built-in Tools:
    - `echo` - Echo back messages (for testing)
    - `get-time` - Returns current Beijing time (UTC+8)
    - `file-list` - List files in directories (recursive)
    - `memory_search` - Semantic search across all memories
    - `memory_get` - Read specific memory files

### How It Works
```
Your Message → Agent → Memory Search (optional) → GLM (decides tool/tool use) → Tool execution → Result → You
```

The agent can search its semantic memory when relevant context is needed, providing a mix of long-term facts and recent context.

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
# GLM API Configuration
GLM_API_KEY=your-glm-api-key
GLM_URL=https://your-glm-api-endpoint/v1/chat/completions

# Embedding Model Configuration (for semantic memory)
EMBEDDING_API_KEY=your-embedding-api-key
EMBEDDING_URL=https://open.bigmodel.cn/api/anthropic
EMBEDDING_MODEL=embedding-3-pro
EMBEDDING_DIMENSIONS=1024
```

**Note:** The actual API keys are already configured in `.env`. Never commit real API keys to git. Use `.env.example` as a template.

### Memory System Setup

The semantic memory system creates a workspace at `~/.my-assistant/`:

```bash
~/.my-assistant/
├── MEMORY.md              # Add long-term knowledge here
├── memory/
│   └── 2025-02-27.md      # Daily logs (auto-created)
└── memory.db              # SQLite database (auto-generated)
```

**Memory Types:**
- **Long-term (`MEMORY.md`)**: Curated facts, preferences, decisions (never decays)
- **Daily logs**: Running context, temporary notes (decays over 30 days)

**Embedding Configuration:**
- **Provider**: Configurable (custom embedding API)
- **Model**: embedding-3-pro
- **URL**: https://open.bigmodel.cn/api/anthropic
- **Dimensions**: 1024
- **API Key**: Loaded from `EMBEDDING_API_KEY` environment variable

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

You: What did we discuss about Python?
Agent: [Searches memory] We discussed that Python is a programming language you're learning...
```

### Programmatic Usage

```typescript
import { AgentExecutor } from './agent/executor';
import { GLMClient } from './llm/glm';
import { ToolRegistry } from './tools';
import { echoTool, getTimeTool, fileListTool } from './built-in-tools';
import { MemorySystem } from './memory/index';
import { ConfigurableEmbeddingProvider } from './memory/embeddings/configurable';

const glmClient = new GLMClient({
  apiKey: process.env.GLM_API_KEY,
  baseURL: process.env.GLM_URL,
  model: 'glm-4.6',
});

const tools = new ToolRegistry();
tools.register(echoTool);
tools.register(getTimeTool);
tools.register(fileListTool);

// Semantic memory system with custom embeddings
const memory = new MemorySystem({
  workspaceDir: '~/.my-assistant',
  provider: 'configurable',
  apiKey: process.env.EMBEDDING_API_KEY,
  baseURL: process.env.EMBEDDING_URL,
  embeddingModel: process.env.EMBEDDING_MODEL || 'embedding-3-pro',
  embeddingDimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || '1024'),
  embeddingURL: process.env.EMBEDDING_URL,
  embeddings: new ConfigurableEmbeddingProvider({
    apiKey: process.env.EMBEDDING_API_KEY,
    url: process.env.EMBEDDING_URL,
    model: process.env.EMBEDDING_MODEL || 'embedding-3-pro',
    dimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || '1024')
  }),
  search: {
    vectorWeight: 0.7,
    keywordWeight: 0.3
  },
  sync: {
    onSearch: true,
    watch: false
  }
});

// Register memory tools
tools.register(memorySearchTool(memory));
tools.register(memoryGetTool(memory));

await memory.initialize();

const agent = new AgentExecutor({
  llmClient: glmClient,
  tools,
});

const response = await agent.processMessage('What did we discuss about Python?');
console.log(response);
```

## 📁 Project Structure

```
my-assistant/
├── src/
│   ├── agent/              # Agent system
│   │   ├── executor.ts     # Agent "brain" - processes messages
│   │   ├── tools.ts        # Tool interface and registry
│   │   ├── built-in-tools.ts  # Built-in tools (echo, get-time, file-list)
│   │   └── memory-tools.ts     # Memory tools (memory_search, memory_get)
│   ├── cli/                # Command-line interface
│   │   └── chat.ts         # Interactive chat CLI
│   ├── llm/                # LLM integration
│   │   └── glm.ts          # GLM API client
│   ├── memory/             # Semantic memory system (OpenClaw-style)
│   │   ├── types.ts        # Memory interfaces
│   │   ├── index.ts        # MemorySystem orchestrator
│   │   ├── storage/        # File + database storage
│   │   │   ├── database.ts  # SQLite with FTS5
│   │   │   ├── file-store.ts # Markdown file management
│   │   │   └── schema.ts    # DB schema
│   │   ├── embeddings/     # Embedding providers
│   │   │   ├── provider.ts # Interface
│   │   │   ├── mock-provider.ts # Testing
│   │   │   ├── openai.ts   # OpenAI API
│   │   │   └── configurable.ts # Custom API
│   │   ├── search/         # Search algorithms
│   │   │   ├── vector.ts   # Cosine similarity
│   │   │   ├── keyword.ts  # BM25 keyword search
│   │   │   ├── hybrid.ts   # Result merging
│   │   │   ├── mmr.ts      # MMR re-ranking
│   │   │   └── temporal-decay.ts # Time-based scoring
│   │   └── chunking/       # Text processing
│   │       └── chunker.ts  # Text chunking with overlap
│   ├── config/             # Configuration management
│   └── examples/           # Example scripts
├── docs/plans/             # Learning plan and design docs
├── data/                   # Legacy memory storage (gitignored)
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
- 62 tests passing
- Unit tests for all components
- Integration tests with real GLM API
- Memory system tests: 24 tests covering all modules
  - Storage layer (database, file-store)
  - Embedding providers (mock, OpenAI, configurable)
  - Search algorithms (vector, keyword, hybrid, MMR, decay)
  - Chunking and orchestration

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

### Memory Search Tool
Semantic search across all stored memories.

```
User: What did we discuss about Python?
Tool Result: { results: [{ path: 'memory/2025-02-20.md', lines: '5-10', score: 0.92, snippet: 'Python is a programming language...' }], count: 1 }
Agent Response: We discussed that Python is a programming language you're learning...
```

### Memory Get Tool
Read specific memory files.

```
User: Read my MEMORY.md file
Tool Result: { content: '# Long-term Knowledge\n\n## Project Goals\n...' }
Agent Response: Here's what you have in your long-term memory...
```

## 🧠 Memory System

The agent uses an OpenClaw-style semantic memory system for retrieval-augmented generation.

### Architecture

**Storage Layer:**
- File-based: Markdown files in `~/.my-assistant/`
- Database: SQLite with FTS5 full-text search
- Embedding cache: Avoid re-computation

**Search Algorithms:**
- **Vector Search**: Cosine similarity on embeddings
- **Keyword Search**: BM25 ranking on FTS5
- **Hybrid Search**: Weighted merge (default: 0.7 vector + 0.3 keyword)
- **MMR Re-ranking**: Reduces redundant results
- **Temporal Decay**: Boosts recent memories (30-day half-life)

**Memory Types:**
- `MEMORY.md`: Long-term curated knowledge (never decays)
- `memory/YYYY-MM-DD.md`: Daily logs (subject to temporal decay)

### Usage

The agent automatically searches memory when it needs context. You can also:

1. **Add to memory manually:**
   ```bash
   # Edit ~/.my-assistant/MEMORY.md
   echo "Important fact I want to remember" >> ~/.my-assistant/memory/$(date +%Y-%m-%d).md
   ```

2. **Search via agent:**
   ```
   You: What do you remember about my project?
   Agent: [Searches memory] Based on your memory, you're building an AI assistant to learn...
   ```

3. **Memory decay:** Daily memories automatically decay over 30 days
   - Today: 100% relevance
   - 30 days: 50% relevance
   - 90 days: 12.5% relevance

### Configuration

To use your custom embedding model (embedding-3-pro):

1. **Set up environment variables** in `.env`:
```env
EMBEDDING_API_KEY=your-embedding-api-key
EMBEDDING_URL=https://open.bigmodel.cn/api/anthropic
EMBEDDING_MODEL=embedding-3-pro
EMBEDDING_DIMENSIONS=1024
```

2. **The CLI automatically loads these** from `.env` and uses them for semantic memory.

3. **API endpoint format** (for your reference):
```typescript
POST https://open.bigmodel.cn/api/anthropic
Content-Type: application/json
Authorization: Bearer <EMBEDDING_API_KEY>

{
  "model": "embedding-3-pro",
  "input": "your text here"
}
```

**Current configuration in this project:**
- Model: `embedding-3-pro`
- URL: `https://open.bigmodel.cn/api/anthropic`
- Dimensions: 1024
- API Key: Loaded from `EMBEDDING_API_KEY` environment variable

**Security:**
- API key is stored in `.env` (gitignored)
- Never committed to version control
- Loaded at runtime via `process.env.EMBEDDING_API_KEY`

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

### Phase 4: Semantic Memory ✅
- Replaced conversation-based memory with OpenClaw-style semantic memory
- Implemented file-based storage (Markdown files)
- Added hybrid search: vector embeddings + BM25 keyword
- Implemented advanced features: MMR re-ranking, temporal decay
- Created memory tools for agent (memory_search, memory_get)
- **Status:** Complete

### Phase 5: Custom Embedding Model ✅
- Integrated custom embedding model (embedding-3-pro)
- Configured via environment variables (secure)
- API endpoint: https://open.bigmodel.cn/api/anthropic
- **Status:** Complete

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
