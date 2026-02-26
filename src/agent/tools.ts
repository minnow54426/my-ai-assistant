/**
 * JSON Schema for tool parameters
 */
export type ToolParameterSchema = {
  type: "object";
  properties: Record<string, { type: string; description?: string }>;
  required: string[];
};

/**
 * Tool interface with type-safe input and output
 * @template T - Input parameter type
 * @template R - Return type
 */
export interface Tool<T = unknown, R = unknown> {
  name: string;
  description: string;
  parameters: ToolParameterSchema;
  execute: (params: T) => Promise<R>;
}

/**
 * Registry for managing tools
 */
export class ToolRegistry {
  private tools: Map<string, Tool<unknown, unknown>> = new Map();

  /**
   * Register a tool
   * @throws Error if tool with same name already exists
   */
  register<T, R>(tool: Tool<T, R>): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }
    this.tools.set(tool.name, tool as Tool<unknown, unknown>);
  }

  /**
   * Get a tool by name
   * @returns Tool or undefined if not found
   */
  get(name: string): Tool<unknown, unknown> | undefined {
    return this.tools.get(name);
  }

  /**
   * Execute a tool by name
   * @throws Error if tool not found
   */
  async execute<T, R>(name: string, params: T): Promise<R> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }
    return tool.execute(params) as Promise<R>;
  }

  /**
   * List all registered tools
   */
  list(): Tool<unknown, unknown>[] {
    return Array.from(this.tools.values());
  }

  /**
   * List all tool names
   */
  listNames(): string[] {
    return Array.from(this.tools.keys());
  }
}
