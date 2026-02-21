import { AgentExecutor } from "./executor";
import { ToolRegistry } from "./tools";
import { GLMClient } from "../llm/glm";

// Mock GLM client
const mockGLMClient = {
  sendMessage: jest.fn(),
} as unknown as GLMClient;

// Mock fetch for GLM client tests
jest.mock("../llm/glm", () => ({
  GLMClient: jest.fn().mockImplementation(() => mockGLMClient),
}));

describe("AgentExecutor", () => {
  let executor: AgentExecutor;
  let tools: ToolRegistry;

  beforeEach(() => {
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
      execute: async (params) => `Echo: ${params.message}`,
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

    executor = new AgentExecutor({
      llmClient: mockGLMClient,
      tools,
    });

    jest.clearAllMocks();
  });

  describe("initialization", () => {
    it("creates executor with LLM client and tools", () => {
      expect(executor).toBeDefined();
    });

    it("stores reference to tools", () => {
      const toolNames = executor.listTools();

      expect(toolNames).toContain("echo");
      expect(toolNames).toContain("get-time");
    });
  });

  describe("processMessage", () => {
    it("processes simple message without tool call", async () => {
      (mockGLMClient.sendMessage as jest.Mock).mockResolvedValue({
        content: "Hello! How can I help you today?",
      });

      const response = await executor.processMessage("Hello!");

      expect(response).toBe("Hello! How can I help you today?");
      expect(mockGLMClient.sendMessage).toHaveBeenCalledTimes(1);
    });

    it("processes message with tool call", async () => {
      // LLM responds with tool call
      (mockGLMClient.sendMessage as jest.Mock)
        .mockResolvedValueOnce({
          content: 'I\'ll echo that for me. Using tool: echo with params: {"message":"test"}',
        })
        // Second call for final response
        .mockResolvedValueOnce({
          content: 'I echoed "test" for you. The result was: Echo: test',
        });

      const response = await executor.processMessage("Echo 'test' for me");

      expect(response).toContain("test");
      expect(mockGLMClient.sendMessage).toHaveBeenCalledTimes(2);
    });

    it("handles tool execution errors gracefully", async () => {
      // Register a tool that throws an error
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
        content: "Using error-tool",
      });

      const response = await executor.processMessage("Use the error tool");

      // Should handle error gracefully
      expect(response).toBeDefined();
    });

    it("passes tool descriptions to LLM", async () => {
      (mockGLMClient.sendMessage as jest.Mock).mockResolvedValue({
        content: "Response",
      });

      await executor.processMessage("What tools do you have?");

      const llmCall = (mockGLMClient.sendMessage as jest.Mock).mock.calls[0][0];

      // Verify tools are mentioned in the prompt
      expect(llmCall).toContain("echo");
      expect(llmCall).toContain("get-time");
    });
  });

  describe("tool integration", () => {
    it("lists available tools", () => {
      const toolList = executor.listTools();

      expect(toolList).toEqual(["echo", "get-time"]);
    });

    it("gets tool description", () => {
      const desc = executor.getToolDescription("echo");

      expect(desc).toContain("echo");
      expect(desc).toContain("Echoes the message");
    });
  });
});
