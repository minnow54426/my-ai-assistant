import { ToolRegistry } from "./tools";
import { echoTool, getTimeTool, fileListTool } from "./built-in-tools";

describe("Built-in Tools", () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
    registry.register(echoTool);
    registry.register(getTimeTool);
    registry.register(fileListTool);
  });

  describe("echo tool", () => {
    it("echoes back the message", async () => {
      const result = await registry.execute("echo", { message: "Hello, World!" });

      expect(result).toBe("Echo: Hello, World!");
    });

    it("is registered correctly", () => {
      const tool = registry.get("echo");

      expect(tool).toBeDefined();
      expect(tool?.name).toBe("echo");
      expect(tool?.description).toContain("Echoes back");
    });
  });

  describe("get-time tool", () => {
    it("returns current time as ISO string", async () => {
      const result = await registry.execute("get-time", {});

      expect(result).toMatch(/\d{4}-\d{2}-\d{2}T/);
      expect(result).toContain("Beijing Time");
    });

    it("returns recent time", async () => {
      const result = await registry.execute("get-time", {});
      // Extract the timestamp from the result
      const timestampMatch = (result as string).match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
      expect(timestampMatch).toBeDefined();

      // Parse Beijing time (which is UTC+8)
      const resultDate = new Date(timestampMatch![1] + 'Z');
      const beijingDate = new Date(resultDate.getTime() - (8 * 60 * 60 * 1000));
      const now = new Date();
      const diffMs = Math.abs(now.getTime() - beijingDate.getTime());

      // Should be within last 5 seconds
      expect(diffMs).toBeLessThan(5000);
    });
  });

  describe("file-list tool", () => {
    it("lists files in current directory", async () => {
      const result = await registry.execute("file-list", {
        directory: __dirname,
      });

      expect(result).toHaveProperty("directory");
      expect(result).toHaveProperty("files");
      expect(Array.isArray((result as any).files)).toBe(true);
    });

    it("lists TypeScript files when pattern provided", async () => {
      const result = await registry.execute("file-list", {
        directory: __dirname,
        pattern: "*.ts",
      });

      const files = (result as any).files as string[];
      files.forEach((file) => {
        expect(file).toMatch(/\.ts$/);
      });
    });

    it("throws error for non-existent directory", async () => {
      await expect(
        registry.execute("file-list", { directory: "/non/existent/path" })
      ).rejects.toThrow("Failed to list directory");
    });
  });

  describe("tool registry", () => {
    it("has all three built-in tools registered", () => {
      const names = registry.listNames();

      expect(names).toContain("echo");
      expect(names).toContain("get-time");
      expect(names).toContain("file-list");
      expect(names).toHaveLength(3);
    });
  });
});
