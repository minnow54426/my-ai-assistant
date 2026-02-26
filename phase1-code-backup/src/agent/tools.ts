/**
 * Tool System for Agent
 *
 * Tools are the building blocks that give an agent capabilities.
 * Each tool has a name, description, parameter schema, and execute function.
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * JSON Schema for tool parameters
 */
export type ToolParameterSchema = {
  type: "object";
  properties: Record<string, { type: string; description?: string }>;
  required: string[];
};

/**
 * A tool that the agent can execute
 *
 * @template T - Input parameter type
 * @template R - Return type
 */
export interface Tool<T = Record<string, unknown>, R = unknown> {
  /** Unique name for the tool */
  name: string;

  /** Human-readable description of what the tool does */
  description: string;

  /** JSON schema for validating parameters */
  parameters: ToolParameterSchema;

  /** Function that executes the tool logic */
  execute: (params: T) => Promise<R>;
}

/**
 * Registry for managing available tools
 */
export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  /**
   * Register a new tool
   *
   * @param tool - The tool to register
   * @throws {Error} If a tool with the same name already exists
   */
  register<T = Record<string, unknown>, R = unknown>(tool: Tool<T, R>): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }
    this.tools.set(tool.name, tool as Tool);
  }

  /**
   * Get a tool by name
   *
   * @param name - The tool name
   * @returns The tool, or undefined if not found
   */
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if a tool exists
   *
   * @param name - The tool name
   * @returns True if the tool is registered
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Execute a tool by name
   *
   * @param name - The tool name
   * @param params - Parameters to pass to the tool
   * @returns The result of tool execution
   * @throws {Error} If the tool is not found
   */
  async execute<T = Record<string, unknown>, R = unknown>(
    name: string,
    params: T
  ): Promise<R> {
    const tool = this.get(name);

    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    return (tool.execute as (params: T) => Promise<R>)(params);
  }

  /**
   * List all registered tools
   *
   * @returns Array of all registered tools
   */
  list(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get names of all registered tools
   *
   * @returns Array of tool names
   */
  listNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Get the count of registered tools
   *
   * @returns Number of tools
   */
  count(): number {
    return this.tools.size;
  }
}
