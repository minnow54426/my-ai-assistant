import { ToolRegistry } from "./tools";
import { GLMClient } from "../llm/glm";
import { MemoryManager } from "../memory/memory-manager";

/**
 * Configuration for AgentExecutor
 */
export interface AgentExecutorConfig {
  llmClient: GLMClient;
  tools: ToolRegistry;
  memoryManager?: MemoryManager; // Optional for backward compatibility
}

/**
 * Tool call representation
 */
export type ToolCall = {
  name: string;
  params: Record<string, unknown>;
};

/**
 * AgentExecutor - The "brain" of the AI agent
 *
 * Orchestrates the flow between LLM and tools:
 * 1. Receives user message
 * 2. Sends to LLM with tool descriptions
 * 3. Detects if LLM wants to use a tool
 * 4. Executes tool if needed
 * 5. Returns final response
 *
 * Design principle: Stateless - each message is processed independently
 * Optional: MemoryManager provides conversation context when configured
 */
export class AgentExecutor {
  private llmClient: GLMClient;
  private tools: ToolRegistry;
  private memoryManager?: MemoryManager;

  constructor(config: AgentExecutorConfig) {
    this.llmClient = config.llmClient;
    this.tools = config.tools;
    this.memoryManager = config.memoryManager;
  }

  /**
   * Process a user message through the agent
   * Two-phase flow: Decision → Execution → Response
   */
  async processMessage(message: string): Promise<string> {
    // Step 1: Add user message to memory (before processing)
    if (this.memoryManager) {
      await this.memoryManager.addMessage({
        role: 'user',
        content: message,
        timestamp: new Date()
      });
    }

    // Step 2: Build system prompt with tool descriptions
    const systemPrompt = this.buildSystemPrompt();

    // Step 3: Get memory context if available
    const memoryContext = this.memoryManager ? this.memoryManager.getContext() : '';

    // Step 4: Build full prompt with memory context
    const prompt = memoryContext
      ? `${systemPrompt}\n\n${memoryContext}\n\nUser: ${message}\nAssistant:`
      : `${systemPrompt}\n\nUser: ${message}\nAssistant:`;

    // Step 5: Send to LLM
    const response = await this.llmClient.sendMessage(prompt);

    // Step 6: Check if LLM wants to use a tool
    const toolCall = this.parseToolCall(response.content);

    if (toolCall) {
      // Phase 2: Execute tool and get final response

      try {
        // Step 7: Execute the tool
        const toolResult = await this.tools.execute(toolCall.name, toolCall.params);

        // Step 8: Send result back to LLM for natural response
        const followUpPrompt = `You just used the ${toolCall.name} tool and got this result: ${JSON.stringify(toolResult)}

Please provide a helpful, natural response to the user's question using this information.
Do NOT mention using a tool or repeat the tool call format. Just answer naturally.

User's question: ${message}`;

        const finalResponse = await this.llmClient.sendMessage(followUpPrompt);

        // Step 9: Add assistant response with tool call to memory
        if (this.memoryManager) {
          await this.memoryManager.addMessage({
            role: 'assistant',
            content: finalResponse.content,
            timestamp: new Date(),
            toolCall: toolCall,
            toolResult: toolResult
          });
        }

        return finalResponse.content;
      } catch (error) {
        // Handle tool execution errors gracefully
        const errorMessage = `Error executing tool ${toolCall.name}: ${error instanceof Error ? error.message : "Unknown error"}`;

        // Add error to memory
        if (this.memoryManager) {
          await this.memoryManager.addMessage({
            role: 'assistant',
            content: errorMessage,
            timestamp: new Date(),
            toolCall: toolCall,
            toolResult: error instanceof Error ? error.message : "Unknown error"
          });
        }

        return errorMessage;
      }
    }

    // Step 10: Add assistant response to memory (no tool call)
    if (this.memoryManager) {
      await this.memoryManager.addMessage({
        role: 'assistant',
        content: response.content,
        timestamp: new Date()
      });
    }

    // No tool needed, return direct response
    return response.content;
  }

  /**
   * Build system prompt with tool descriptions
   * This tells the LLM what tools are available and how to use them
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
   * Extracts tool name and parameters using regex
   *
   * Format: "Using tool: <name> with params: <json>"
   *
   * Returns undefined if no tool call is detected
   */
  private parseToolCall(response: string): { name: string; params: Record<string, unknown> } | undefined {
    // Regex pattern to match tool calls
    // Important: [\w-]+ supports hyphens in tool names (e.g., "get-time")
    const toolPattern = /Using tool:\s*([\w-]+)\s+with params:\s*(\{.*\})/i;
    const match = response.match(toolPattern);

    if (!match) {
      return undefined;
    }

    const name = match[1];
    const paramsJson = match[2];

    try {
      const params = JSON.parse(paramsJson);
      return { name, params };
    } catch {
      // Invalid JSON, return undefined
      return undefined;
    }
  }

  /**
   * List all available tool names
   */
  listTools(): string[] {
    return this.tools.listNames();
  }

  /**
   * Get description for a specific tool
   */
  getToolDescription(toolName: string): string {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return `Tool not found: ${toolName}`;
    }
    return `${tool.name}: ${tool.description}`;
  }
}
