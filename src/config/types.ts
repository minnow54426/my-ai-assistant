export interface AgentConfig {
    provider: "anthropic" | "openai" | "google" | "glm";
    apiKey: string;
    model: string;
    baseURL?: string;  // For GLM and other custom endpoints
}

export interface Config {
    agent: AgentConfig;
    logLevel: "debug" | "info" | "warn" | "error";
}