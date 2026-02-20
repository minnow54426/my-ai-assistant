/**
 * GLM (ChatGLM/Zhipu AI) API Client
 *
 * Provides a type-safe interface for interacting with the GLM API.
 * The GLM API follows an OpenAI-compatible format with some customizations.
 */

import fetch from "node-fetch";

// ============================================================================
// Public Interfaces
// ============================================================================

/**
 * Configuration options for creating a GLM client instance.
 */
export interface GLMClientConfig {
  /** API key for authentication (loaded from environment variable) */
  apiKey: string;
  /** Base URL for the GLM API endpoint */
  baseURL: string;
  /** Model identifier (e.g., "glm-4.6", "glm-4-plus") */
  model: string;
}

/**
 * Standardized response format returned to the client.
 */
export interface GLMMessageResponse {
  /** The generated text content from the model */
  content: string;
}

// ============================================================================
// Private API Types
// ============================================================================

/**
 * Message format expected by the GLM API.
 */
interface GLMMessage {
  /** Role of the message sender ("user", "assistant", "system") */
  role: string;
  /** The text content of the message */
  content: string;
}

/**
 * Request body structure for GLM API calls.
 */
interface GLMRequestBody {
  /** The model to use for generation */
  model: string;
  /** Array of conversation messages */
  messages: GLMMessage[];
}

/**
 * Error response format returned by some GLM API providers.
 * This is a custom format that differs from the standard OpenAI format.
 */
interface GLMErrorResponse {
  /** Status code as a string (e.g., "435" for "Model not support") */
  status: string;
  /** Human-readable error message */
  msg: string;
  /** Always null for error responses */
  body: null;
}

/**
 * Individual choice in the API response (OpenAI-compatible format).
 */
interface GLMChoice {
  message: {
    /** The generated content */
    content: string;
  };
}

/**
 * Success response format following OpenAI-compatible structure.
 */
interface GLMSuccessResponse {
  /** Array of generated choices (typically one for single requests) */
  choices: GLMChoice[];
}

/**
 * Union type representing possible API responses.
 * Used with type guards to discriminate between error and success responses.
 */
type GLMResponse = GLMErrorResponse | GLMSuccessResponse;

// ============================================================================
// GLM Client Implementation
// ============================================================================

/**
 * Client for interacting with the GLM API.
 *
 * @example
 * ```typescript
 * const client = new GLMClient({
 *   apiKey: process.env.GLM_API_KEY,
 *   baseURL: "https://apis.iflow.cn/v1/chat/completions",
 *   model: "glm-4.6"
 * });
 *
 * const response = await client.sendMessage("Hello!");
 * console.log(response.content);
 * ```
 */
export class GLMClient {
  private apiKey: string;
  private baseURL: string;
  private model: string;

  /**
   * Creates a new GLM client instance.
   *
   * @param config - Configuration options for the client
   * @throws {Error} If API key or base URL is not provided
   */
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

  /**
   * Sends a message to the GLM API and returns the generated response.
   *
   * @param message - The user message to send to the model
   * @returns Promise containing the model's response
   * @throws {Error} If the API request fails or returns an unexpected format
   *
   * @example
   * ```typescript
   * const response = await client.sendMessage("Explain quantum computing");
   * console.log(response.content);
   * ```
   */
  async sendMessage(message: string): Promise<GLMMessageResponse> {
    // Build the request body with the user message
    const requestBody: GLMRequestBody = {
      model: this.model,
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
    };

    // Send POST request to the GLM API
    const response = await fetch(this.baseURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Bearer token authentication
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    // Check for HTTP-level errors (4xx, 5xx status codes)
    if (!response.ok) {
      throw new Error(`GLM API error: ${response.status} ${response.statusText}`);
    }

    // Parse the JSON response
    const data = (await response.json()) as GLMResponse;

    // GLM API providers may return custom error responses with a "status" field
    // This handles cases where HTTP 200 is returned but the API indicates an error
    if ("status" in data && data.status !== "200") {
      throw new Error(`GLM API error: ${data.msg || "Unknown error"} (status: ${data.status})}`);
    }

    // Handle successful OpenAI-compatible responses
    // Uses type guard to ensure data has the expected structure
    if ("choices" in data && data.choices[0]) {
      return {
        content: data.choices[0].message.content,
      };
    }

    // If we reach here, the response format is unexpected
    throw new Error(`Unexpected GLM API response format: ${JSON.stringify(data)}`);
  }
}
