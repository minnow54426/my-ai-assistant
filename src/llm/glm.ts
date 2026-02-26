import fetch from "node-fetch";
import { withLock } from "./lock";

// Public interfaces
export interface GLMClientConfig {
  apiKey: string;
  baseURL: string;
  model: string;
}

export interface GLMMessageResponse {
  content: string;
}

// Internal types for GLM API
interface GLMMessage {
  role: string;
  content: string;
}

interface GLMRequestBody {
  model: string;
  messages: GLMMessage[];
}

interface GLMChoice {
  message: {
    content: string;
  };
}

interface GLMSuccessResponse {
  choices: GLMChoice[];
}

interface GLMErrorResponse {
  status: string;
  msg: string;
  body: null;
}

type GLMResponse = GLMSuccessResponse | GLMErrorResponse;

export class GLMClient {
  private apiKey: string;
  private baseURL: string;
  private model: string;

  constructor(config: GLMClientConfig) {
    // Validate required configuration
    if (!config.apiKey) {
      throw new Error("API key is required");
    }
    if (!config.baseURL) {
      throw new Error("Base URL is required");
    }

    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL;
    this.model = config.model;
  }

  async sendMessage(message: string): Promise<GLMMessageResponse> {
    // Wrap entire API call in lock to respect concurrency limit
    return withLock(async () => {
      // Step 1: Build request body
      const requestBody: GLMRequestBody = {
        model: this.model,
        messages: [
          {
            role: "system",
            content: "You are an English-language AI assistant. You MUST respond ONLY in English. NEVER respond in Chinese. If the user writes in Chinese, still respond in English. All your responses must be in English language.",
          },
          {
            role: "user",
            content: message,
          },
        ],
      };

      // Step 2: Send POST request
      const response = await fetch(this.baseURL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      // Step 3: Handle HTTP errors
      if (!response.ok) {
        throw new Error(`GLM API error: ${response.status} ${response.statusText}`);
      }

      // Step 4: Parse JSON response
      const data = (await response.json()) as GLMResponse;

      // Step 5: Check for custom error format (GLM API may return HTTP 200 with error body)
      if ("status" in data && data.status !== "200") {
        throw new Error(`GLM API error: ${data.msg || "Unknown error"} (status: ${data.status})`);
      }

      // Step 6: Check for success format
      if ("choices" in data && data.choices[0]) {
        return {
          content: data.choices[0].message.content,
        };
      }

      // Step 7: Unexpected format
      throw new Error(`Unexpected GLM API response format`);
    });
  }
}
