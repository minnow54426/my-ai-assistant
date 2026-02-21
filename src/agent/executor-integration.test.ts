/**
 * Agent Executor Integration Test
 *
 * Tests the full agent flow with real GLM API:
 * Message → LLM → Tool Decision → Tool Execution → Response
 */

import { AgentExecutor } from "./executor";
import { GLMClient } from "../llm/glm";
import { ToolRegistry } from "./tools";
import { echoTool, getTimeTool, fileListTool } from "./built-in-tools";
import { loadConfig, getDefaultConfigPath } from "../config/load";

describe("AgentExecutor Integration", () => {
  let executor: AgentExecutor;
  let tools: ToolRegistry;
  let glmClient: GLMClient;

  beforeAll(() => {
    // Load configuration
    const config = loadConfig(getDefaultConfigPath());

    // Create GLM client
    glmClient = new GLMClient({
      apiKey: config.agent.apiKey,
      baseURL: config.agent.baseURL!,
      model: config.agent.model,
    });

    // Create tool registry with built-in tools
    tools = new ToolRegistry();
    tools.register(echoTool);
    tools.register(getTimeTool);
    tools.register(fileListTool);

    // Create agent executor
    executor = new AgentExecutor({
      llmClient: glmClient,
      tools,
    });
  });

  it("processes simple message without tool", async () => {
    const response = await executor.processMessage("Hello! What's your name?");

    console.log("\n=== Simple Message Test ===");
    console.log("User: Hello! What's your name?");
    console.log("Agent:", response);

    expect(response).toBeDefined();
    expect(typeof response).toBe("string");
    expect(response.length).toBeGreaterThan(0);
  }, 30000);

  it("uses echo tool when asked to repeat something", async () => {
    const response = await executor.processMessage("Please echo the message: Hello World");

    console.log("\n=== Echo Tool Test ===");
    console.log("User: Please echo the message: Hello World");
    console.log("Agent:", response);

    expect(response).toBeDefined();
    expect(typeof response).toBe("string");
    // The response should contain the echoed message
    expect(response.toLowerCase()).toContain("hello");
  }, 30000);

  it("uses get-time tool when asked for current time", async () => {
    const response = await executor.processMessage("What time is it?");

    console.log("\n=== Get Time Tool Test ===");
    console.log("User: What time is it?");
    console.log("Agent:", response);

    expect(response).toBeDefined();
    expect(typeof response).toBe("string");
    // Response should mention time or contain a timestamp
    expect(response.toLowerCase()).toMatch(/time|date|\d{4}-\d{2}-\d{2}/);
  }, 30000);

  it("lists available tools when asked", async () => {
    const response = await executor.processMessage("What tools do you have?");

    console.log("\n=== List Tools Test ===");
    console.log("User: What tools do you have?");
    console.log("Agent:", response);

    expect(response).toBeDefined();
    expect(response.toLowerCase()).toMatch(/echo|time|file/);
  }, 30000);

  it("handles tool execution errors gracefully", async () => {
    const response = await executor.processMessage(
      "Use the file-list tool to list files in /nonexistent/directory/path/that/does/not/exist/xyz123"
    );

    console.log("\n=== Error Handling Test ===");
    console.log("User: List files in /nonexistent/directory/path/that/does/not/exist/xyz123");
    console.log("Agent:", response);

    expect(response).toBeDefined();
    // Should handle the error gracefully
  }, 30000);
});
