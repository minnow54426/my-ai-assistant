import { GLMClient } from "./glm";

// Mock fetch at the top level
const mockFetch = jest.fn();
jest.mock("node-fetch", () => () => mockFetch());

describe("GLMClient", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe("initialization", () => {
    it("creates client with API key and base URL", () => {
      const client = new GLMClient({
        apiKey: "test-key",
        baseURL: "https://api.example.com/v1/chat/completions",
        model: "glm-4",
      });

      expect(client).toBeDefined();
    });

    it("throws error when API key is empty", () => {
      expect(() => {
        new GLMClient({
          apiKey: "",
          baseURL: "https://api.example.com/v1/chat/completions",
          model: "glm-4",
        });
      }).toThrow("API key is required");
    });

    it("throws error when base URL is empty", () => {
      expect(() => {
        new GLMClient({
          apiKey: "test-key",
          baseURL: "",
          model: "glm-4",
        });
      }).toThrow("Base URL is required");
    });
  });

  describe("sendMessage", () => {
    it("sends message and returns response", async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: "Hello! How can I help you?",
              },
            },
          ],
        }),
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const client = new GLMClient({
        apiKey: "test-key",
        baseURL: "https://api.example.com/v1/chat/completions",
        model: "glm-4",
      });

      const response = await client.sendMessage("Hello, GLM!");

      expect(response).toHaveProperty("content");
      expect(typeof response.content).toBe("string");
      expect(response.content).toBe("Hello! How can I help you?");
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("throws error when API request fails", async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const client = new GLMClient({
        apiKey: "invalid-key",
        baseURL: "https://api.example.com/v1/chat/completions",
        model: "glm-4",
      });

      await expect(client.sendMessage("Hello")).rejects.toThrow(
        "GLM API error: 401 Unauthorized"
      );
    });
  });
});
