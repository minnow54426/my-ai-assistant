import fetch from "node-fetch";

export interface GLMClientConfig {
  apiKey: string;
  baseURL: string;
  model: string;
}

export interface GLMMessageResponse {
  content: string;
}

interface GLMMessage {
  role: string;
  content: string;
}

interface GLMRequestBody {
  model: string;
  messages: GLMMessage[];
}

interface GLMErrorResponse {
  status: string;
  msg: string;
  body: null;
}

interface GLMChoice {
  message: {
    content: string;
  };
}

interface GLMSuccessResponse {
  choices: GLMChoice[];
}

type GLMResponse = GLMErrorResponse | GLMSuccessResponse;

export class GLMClient {
  private apiKey: string;
  private baseURL: string;
  private model: string;

  constructor(config: GLMClientConfig) {
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
    const requestBody: GLMRequestBody = {
      model: this.model,
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
    };

    const response = await fetch(this.baseURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`GLM API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as GLMResponse;

    // Handle GLM API error response format
    if ("status" in data && data.status !== "200") {
      throw new Error(`GLM API error: ${data.msg || "Unknown error"} (status: ${data.status})`);
    }

    // Handle standard OpenAI-compatible response format
    if ("choices" in data && data.choices[0]) {
      return {
        content: data.choices[0].message.content,
      };
    }

    throw new Error(`Unexpected GLM API response format: ${JSON.stringify(data)}`);
  }
}
