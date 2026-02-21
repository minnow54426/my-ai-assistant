import { Tool, ToolRegistry } from "./tools";

describe("Tool Interface", () => {
  describe("Tool", () => {
    it("defines tool structure with name, description, and execute function", () => {
      const mockTool: Tool<{ message: string }, string> = {
        name: "test-tool",
        description: "A test tool",
        parameters: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
          required: ["message"],
        },
        execute: async (params) => {
          return `Echo: ${params.message}`;
        },
      };

      expect(mockTool.name).toBe("test-tool");
      expect(mockTool.description).toBe("A test tool");
      expect(typeof mockTool.execute).toBe("function");
    });

    it("executes tool with parameters and returns result", async () => {
      const tool: Tool<{ message: string }, string> = {
        name: "echo",
        description: "Echoes the message",
        parameters: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
          required: ["message"],
        },
        execute: async (params) => {
          return `Echo: ${params.message}`;
        },
      };

      const result = await tool.execute({ message: "Hello" });

      expect(result).toBe("Echo: Hello");
    });
  });

  describe("ToolRegistry", () => {
    it("creates empty registry", () => {
      const registry = new ToolRegistry();

      expect(registry.list()).toHaveLength(0);
    });

    it("registers a tool", () => {
      const registry = new ToolRegistry();
      const tool: Tool<{ message: string }, string> = {
        name: "echo",
        description: "Echoes the message",
        parameters: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
          required: ["message"],
        },
        execute: async (params) => params.message,
      };

      registry.register(tool);

      expect(registry.list()).toHaveLength(1);
      expect(registry.list()[0].name).toBe("echo");
    });

    it("retrieves tool by name", () => {
      const registry = new ToolRegistry();
      const tool: Tool<{ message: string }, string> = {
        name: "echo",
        description: "Echoes the message",
        parameters: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
          required: ["message"],
        },
        execute: async (params) => params.message,
      };

      registry.register(tool);
      const retrieved = registry.get("echo");

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe("echo");
    });

    it("returns undefined for non-existent tool", () => {
      const registry = new ToolRegistry();

      const retrieved = registry.get("does-not-exist");

      expect(retrieved).toBeUndefined();
    });

    it("executes tool by name", async () => {
      const registry = new ToolRegistry();
      const tool: Tool<{ message: string }, string> = {
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
      };

      registry.register(tool);
      const result = await registry.execute("echo", { message: "Test" });

      expect(result).toBe("Echo: Test");
    });

    it("throws error when executing non-existent tool", async () => {
      const registry = new ToolRegistry();

      await expect(
        registry.execute("does-not-exist", {})
      ).rejects.toThrow("Tool not found: does-not-exist");
    });

    it("lists all tool names", () => {
      const registry = new ToolRegistry();

      registry.register({
        name: "tool1",
        description: "First tool",
        parameters: { type: "object", properties: {}, required: [] },
        execute: async () => "result1",
      });

      registry.register({
        name: "tool2",
        description: "Second tool",
        parameters: { type: "object", properties: {}, required: [] },
        execute: async () => "result2",
      });

      const names = registry.listNames();

      expect(names).toEqual(["tool1", "tool2"]);
    });
  });
});
