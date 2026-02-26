/**
 * Agent Executor
 *
 * The "brain" of the agent that:
 * 1. Receives user messages
 * 2. Sends them to the LLM with tool descriptions
 * 3. Detects when LLM wants to use a tool
 * 4. Executes the tool
 * 5. Returns the result
 */

import { GLMClient } from "../llm/glm";
import { ToolRegistry } from "./tools";

// ============================================================================
// Configuration
// ============================================================================

export interface AgentExecutorConfig {
  /** LLM client for generating responses */
  llmClient: GLMClient;
  /** Registry of available tools */
  tools: ToolRegistry;
}

// ============================================================================
// Agent Executor
// ============================================================================

/**
 * Agent executor - processes messages and manages tool execution
 */
export class AgentExecutor {
  private llmClient: GLMClient;
  private tools: ToolRegistry;

  constructor(config: AgentExecutorConfig) {
    this.llmClient = config.llmClient;
    this.tools = config.tools;
  }

  /**
   * Process a user message through the agent
   *
   * @param message - The user's message
   * @returns The agent's response
   */
  async processMessage(message: string): Promise<string> {
    // Build system prompt with tool descriptions
    const systemPrompt = this.buildSystemPrompt();

    // Build full prompt
    const prompt = `${systemPrompt}\n\nUser: ${message}\nAssistant:`;

    // Get response from LLM
    const response = await this.llmClient.sendMessage(prompt);

    // Check if LLM wants to use a tool
    const toolCall = this.parseToolCall(response.content);

    if (toolCall) {
      try {
        // Execute the tool
        const toolResult = await this.tools.execute(toolCall.name, toolCall.params);

        // Send result back to LLM for final response
        // IMPORTANT: Tell the LLM NOT to repeat the tool call, just respond with the result
        const followUpPrompt = `You just used the ${toolCall.name} tool and got this result: ${JSON.stringify(toolResult)}

Please provide a helpful, natural response to the user's question using this information.
Do NOT mention using a tool or repeat the tool call format. Just answer naturally.

User's question: ${message}`;
        const finalResponse = await this.llmClient.sendMessage(followUpPrompt);

        return finalResponse.content;
      } catch (error) {
        return `Error executing tool ${toolCall.name}: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    }

    // No tool call, return LLM response directly
    return response.content;
  }

  /**
   * Build system prompt with available tools
   */
  private buildSystemPrompt(): string {
    const toolDescriptions = this.tools
      .list()
      .map(
        (tool) =>
          `- ${tool.name}: ${tool.description}\n  Parameters: ${JSON.stringify(tool.parameters)}`
      )
      .join("\n");

    return `You are a helpful AI assistant with access to the following tools:

${toolDescriptions}

When you need to use a tool, format your response as:
"Using tool: <tool_name> with params: <json_params>"

For example:
"Using tool: echo with params: {"message":"hello"}"

Always explain what you're doing before using a tool.`;
  }

  /**
   * Parse tool call from LLM response
   *
   * @param response - The LLM response text
   * @returns Tool call if detected, undefined otherwise
   */
  private parseToolCall(response: string): { name: string; params: Record<string, unknown> } | undefined {
    // Pattern: "Using tool: <name> with params: <json>"
    // Tool names can contain hyphens (e.g., get-time, file-list)
    const toolPattern = /Using tool:\s*([\w-]+)\s+with params:\s*(\{.*\})/i;
    const match = response.match(toolPattern);

    if (match) {
      const name = match[1];
      try {
        const params = JSON.parse(match[2]);
        return { name, params };
      } catch {
        // Invalid JSON, return undefined
        return undefined;
      }
    }

    return undefined;
  }

  /**
   * List available tool names
   */
  listTools(): string[] {
    return this.tools.listNames();
  }

  /**
   * Get description for a specific tool
   */
  getToolDescription(name: string): string {
    const tool = this.tools.get(name);

    if (!tool) {
      return `Tool not found: ${name}`;
    }

    return `${tool.name}: ${tool.description}\nParameters: ${JSON.stringify(tool.parameters, null, 2)}`;
  }
}
