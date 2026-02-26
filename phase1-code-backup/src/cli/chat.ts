/**
 * Simple CLI for chatting with the agent
 *
 * Run with: npx tsx src/cli/chat.ts
 */

import * as readline from "readline";
import { AgentExecutor } from "../agent/executor";
import { GLMClient } from "../llm/glm";
import { ToolRegistry } from "../agent/tools";
import { echoTool, getTimeTool, fileListTool } from "../agent/built-in-tools";
import { loadConfig, getDefaultConfigPath } from "../config/load";

async function main() {
  // Load configuration
  const config = loadConfig(getDefaultConfigPath());

  console.log("\n🤖 AI Agent CLI");
  console.log("=".repeat(50));
  console.log(`Provider: ${config.agent.provider}`);
  console.log(`Model: ${config.agent.model}`);
  console.log("=".repeat(50));

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

  console.log("\n✅ Agent ready!");
  console.log("\nAvailable tools:");
  agent.listTools().forEach((toolName) => {
    console.log(`  - ${toolName}: ${agent.getToolDescription(toolName).split("\n")[0]}`);
  });

  console.log("\n💡 Type 'exit' or 'quit' to exit");
  console.log("💡 Type 'tools' to list available tools\n");

  // Create readline interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const chat = () => {
    rl.question("You: ", async (input) => {
      const message = input.trim();

      // Check for exit commands
      if (message.toLowerCase() === "exit" || message.toLowerCase() === "quit") {
        console.log("\n👋 Goodbye!\n");
        rl.close();
        process.exit(0);
        return;
      }

      // Check for tools command
      if (message.toLowerCase() === "tools") {
        console.log("\n📦 Available tools:");
        agent.listTools().forEach((toolName) => {
          console.log(`\n${agent.getToolDescription(toolName)}`);
        });
        console.log();
        chat();
        return;
      }

      // Empty message
      if (!message) {
        chat();
        return;
      }

      // Process message through agent
      try {
        console.log("\n🤖 Agent: ");

        const startTime = Date.now();
        const response = await agent.processMessage(message);
        const duration = Date.now() - startTime;

        console.log(response);
        console.log(`\n⏱️  Took ${duration}ms\n`);
      } catch (error) {
        console.log(`\n❌ Error: ${error instanceof Error ? error.message : "Unknown error"}\n`);
      }

      // Continue chatting
      chat();
    });
  };

  // Start chat loop
  chat();
}

main().catch((error) => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});
