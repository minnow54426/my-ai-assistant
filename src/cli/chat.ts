/**
 * Simple CLI for chatting with the agent
 *
 * Run with: npx tsx src/cli/chat.ts
 */

import * as readline from "readline";
import * as path from "path";
import { AgentExecutor } from "../agent/executor";
import { GLMClient } from "../llm/glm";
import { ToolRegistry } from "../agent/tools";
import { echoTool, getTimeTool, fileListTool } from "../agent/built-in-tools";
import { loadConfig, getDefaultConfigPath } from "../config/load";
import { MemoryManager } from "../memory/memory-manager";

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

  // Create memory manager with shared memory
  const memoryPath = path.join(process.cwd(), 'data', 'shared-memory.json');
  const memoryManager = new MemoryManager(
    {
      storagePath: memoryPath,
      maxRecentMessages: 15,
      summarizeAfter: 20,
      maxSummaries: 50,
    },
    glmClient
  );

  // Create tool registry with built-in tools
  const tools = new ToolRegistry();
  tools.register(echoTool);
  tools.register(getTimeTool);
  tools.register(fileListTool);

  // Create agent executor with memory manager
  const agent = new AgentExecutor({
    llmClient: glmClient,
    tools,
    memoryManager,
  });

  console.log("\n✅ Agent ready!");
  console.log("\n📝 Memory is shared across all sessions");
  console.log("\nAvailable tools:");
  agent.listTools().forEach((toolName) => {
    console.log(`  - ${toolName}: ${agent.getToolDescription(toolName).split("\n")[0]}`);
  });

  console.log("\n💡 Commands:");
  console.log("  - 'exit' or 'quit' to exit");
  console.log("  - 'tools' to list available tools");
  console.log("  - '/stats' to show memory statistics");
  console.log("  - '/clear' to learn about resetting memory\n");

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

      // Check for /stats command
      if (message.toLowerCase() === "/stats") {
        const stats = memoryManager.getStats();
        console.log("\n📊 Memory Statistics:");
        console.log(`  Total messages processed: ${stats.totalMessages}`);
        console.log(`  Recent messages: ${stats.recentCount}`);
        console.log(`  Summaries: ${stats.summaryCount}`);
        console.log(`  Last updated: ${stats.lastUpdated.toLocaleString()}`);
        console.log();
        chat();
        return;
      }

      // Check for /clear command
      if (message.toLowerCase() === "/clear") {
        console.log("\nℹ️  Memory Management:");
        console.log("  Memory is shared across all CLI sessions.");
        console.log("  To reset memory, delete the file:");
        console.log(`  ${memoryPath}`);
        console.log("  Then restart this CLI.\n");
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
