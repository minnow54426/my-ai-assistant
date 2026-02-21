/**
 * Test the agent with a few example messages
 */

import { AgentExecutor } from "../agent/executor";
import { GLMClient } from "../llm/glm";
import { ToolRegistry } from "../agent/tools";
import { echoTool, getTimeTool, fileListTool } from "../agent/built-in-tools";
import { loadConfig, getDefaultConfigPath } from "../config/load";

async function main() {
  // Load configuration
  const config = loadConfig(getDefaultConfigPath());

  console.log("\n🤖 Testing AI Agent");
  console.log("=".repeat(50));
  console.log(`Provider: ${config.agent.provider}`);
  console.log(`Model: ${config.agent.model}`);
  console.log("=".repeat(50) + "\n");

  // Create GLM client
  const glmClient = new GLMClient({
    apiKey: config.agent.apiKey,
    baseURL: config.agent.baseURL!,
    model: config.agent.model,
  });

  // Create tool registry with built-in tools
  const tools = new ToolRegistry();
  tools.register(echoTool);
  tools.register(getTimeTool);
  tools.register(fileListTool);

  // Create agent executor
  const agent = new AgentExecutor({
    llmClient: glmClient,
    tools,
  });

  // Test messages
  const testMessages = [
    "Hello! What's your name?",
    "What tools do you have?",
    "Please echo the message: Testing the agent",
    "What time is it?",
    "List TypeScript files in the src directory",
  ];

  for (const message of testMessages) {
    console.log(`\n${"=".repeat(50)}`);
    console.log(`👤 User: ${message}`);
    console.log(`${"=".repeat(50)}`);

    try {
      const startTime = Date.now();
      const response = await agent.processMessage(message);
      const duration = Date.now() - startTime;

      console.log(`\n🤖 Agent: ${response}`);
      console.log(`\n⏱️  Response time: ${duration}ms`);
    } catch (error) {
      console.log(`\n❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log("✅ All tests complete!\n");
}

main().catch((error) => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});
