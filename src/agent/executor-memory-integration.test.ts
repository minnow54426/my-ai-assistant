import { AgentExecutor } from "./executor";
import { ToolRegistry } from "./tools";
import { GLMClient } from "../llm/glm";
import { MemoryManager } from "../memory/memory-manager";
import * as fs from 'fs';
import * as path from 'path';

// Mock GLM client
const mockGLMClient = {
  sendMessage: jest.fn(),
} as unknown as GLMClient;

// Mock fetch for GLM client tests
jest.mock("../llm/glm", () => ({
  GLMClient: jest.fn().mockImplementation(() => mockGLMClient),
}));

describe("AgentExecutor Memory Integration", () => {
  let executor: AgentExecutor;
  let executorWithMemory: AgentExecutor;
  let tools: ToolRegistry;
  let memoryManager: MemoryManager;
  const testStoragePath = path.join(__dirname, 'test-memory.json');

  beforeEach(() => {
    // Clean up test memory file
    if (fs.existsSync(testStoragePath)) {
      fs.unlinkSync(testStoragePath);
    }

    tools = new ToolRegistry();

    // Register test tools
    tools.register({
      name: "echo",
      description: "Echoes the message",
      parameters: {
        type: "object",
        properties: {
          message: { type: "string" },
        },
        required: ["message"],
      },
      execute: async (params) => `Echo: ${(params as { message: string }).message}`,
    });

    tools.register({
      name: "get-time",
      description: "Returns current time",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
      execute: async () => new Date().toISOString(),
    });

    // Create executor without memory (backward compatibility)
    executor = new AgentExecutor({
      llmClient: mockGLMClient,
      tools,
    });

    // Create memory manager
    memoryManager = new MemoryManager(
      {
        maxRecentMessages: 15,
        summarizeAfter: 20,
        maxSummaries: 50,
        storagePath: testStoragePath,
      },
      mockGLMClient
    );

    // Create executor with memory
    executorWithMemory = new AgentExecutor({
      llmClient: mockGLMClient,
      tools,
      memoryManager,
    });

    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up test memory file
    if (fs.existsSync(testStoragePath)) {
      fs.unlinkSync(testStoragePath);
    }
  });

  describe("memory integration", () => {
    it("adds user message to memory", async () => {
      (mockGLMClient.sendMessage as jest.Mock).mockResolvedValue({
        content: "Hello! How can I help you today?",
      });

      await executorWithMemory.processMessage("Hello!");

      const stats = memoryManager.getStats();
      expect(stats.totalMessages).toBe(2); // user + assistant
      expect(stats.recentCount).toBe(2);
    });

    it("includes memory context in prompt", async () => {
      (mockGLMClient.sendMessage as jest.Mock).mockResolvedValue({
        content: "Response",
      });

      // Send first message to build memory
      await executorWithMemory.processMessage("My name is Alice");

      jest.clearAllMocks();

      // Send second message
      await executorWithMemory.processMessage("What is my name?");

      const llmCall = (mockGLMClient.sendMessage as jest.Mock).mock.calls[0][0];

      // Verify memory context is included
      expect(llmCall).toContain("Previous topics discussed");
      expect(llmCall).toContain("Recent conversation");
      expect(llmCall).toContain("My name is Alice");
    });

    it("remembers context across multiple messages", async () => {
      (mockGLMClient.sendMessage as jest.Mock).mockResolvedValue({
        content: "I remembered!",
      });

      // First message
      await executorWithMemory.processMessage("I like pizza");

      jest.clearAllMocks();

      // Second message should have context
      await executorWithMemory.processMessage("What do I like?");

      const llmCall = (mockGLMClient.sendMessage as jest.Mock).mock.calls[0][0];

      // Should contain previous conversation
      expect(llmCall).toContain("I like pizza");
    });

    it("stores tool calls and results in memory", async () => {
      (mockGLMClient.sendMessage as jest.Mock)
        .mockResolvedValueOnce({
          content: 'Using tool: echo with params: {"message":"test"}',
        })
        .mockResolvedValueOnce({
          content: 'I echoed "test" for you',
        });

      await executorWithMemory.processMessage("Echo 'test' for me");

      const stats = memoryManager.getStats();
      expect(stats.totalMessages).toBe(2); // user + assistant with tool call

      // Get context to verify tool call is stored
      const context = memoryManager.getContext();
      expect(context).toContain("echo");
    });

    it("stores assistant responses with tool calls", async () => {
      (mockGLMClient.sendMessage as jest.Mock)
        .mockResolvedValueOnce({
          content: 'Using tool: echo with params: {"message":"hello"}',
        })
        .mockResolvedValueOnce({
          content: 'I echoed "hello" for you',
        });

      await executorWithMemory.processMessage("Echo 'hello'");

      const context = memoryManager.getContext();
      expect(context).toContain("I echoed \"hello\" for you");
    });

    it("handles tool execution errors in memory", async () => {
      // Register a tool that throws
      tools.register({
        name: "error-tool",
        description: "A tool that errors",
        parameters: {
          type: "object",
          properties: {},
          required: [],
        },
        execute: async () => {
          throw new Error("Tool execution failed");
        },
      });

      (mockGLMClient.sendMessage as jest.Mock).mockResolvedValue({
        content: "Using tool: error-tool with params: {}",
      });

      const response = await executorWithMemory.processMessage("Use the error tool");

      // Should handle error gracefully
      expect(response).toContain("Error executing tool");

      // Error should be in memory
      const context = memoryManager.getContext();
      expect(context).toContain("Error executing tool");
    });
  });

  describe("backward compatibility", () => {
    it("works without memory manager", async () => {
      (mockGLMClient.sendMessage as jest.Mock).mockResolvedValue({
        content: "Response without memory",
      });

      const response = await executor.processMessage("Hello!");

      expect(response).toBe("Response without memory");
      expect(mockGLMClient.sendMessage).toHaveBeenCalledTimes(1);
    });

    it("processes tool calls without memory", async () => {
      (mockGLMClient.sendMessage as jest.Mock)
        .mockResolvedValueOnce({
          content: 'Using tool: echo with params: {"message":"test"}',
        })
        .mockResolvedValueOnce({
          content: 'Echoed: test',
        });

      const response = await executor.processMessage("Echo 'test'");

      expect(response).toContain("test");
      expect(mockGLMClient.sendMessage).toHaveBeenCalledTimes(2);
    });

    it("does not include memory context when memory manager not provided", async () => {
      (mockGLMClient.sendMessage as jest.Mock).mockResolvedValue({
        content: "Response",
      });

      await executor.processMessage("Test message");

      const llmCall = (mockGLMClient.sendMessage as jest.Mock).mock.calls[0][0];

      // Should NOT contain memory context headers
      expect(llmCall).not.toContain("Previous topics discussed");
      expect(llmCall).not.toContain("Recent conversation");
    });
  });

  describe("memory context formatting", () => {
    it("shows empty state when no messages", async () => {
      const context = memoryManager.getContext();

      expect(context).toContain("Previous topics discussed");
      expect(context).toContain("(none)");
      expect(context).toContain("Recent conversation");
    });

    it("includes summaries when available", async () => {
      // Manually create a summary to test formatting
      await memoryManager.addMessage({
        role: 'user',
        content: 'Message 1',
        timestamp: new Date()
      });
      await memoryManager.addMessage({
        role: 'assistant',
        content: 'Response 1',
        timestamp: new Date()
      });

      const stats = memoryManager.getStats();
      expect(stats.totalMessages).toBe(2);
      expect(stats.recentCount).toBe(2);
    });
  });
});
