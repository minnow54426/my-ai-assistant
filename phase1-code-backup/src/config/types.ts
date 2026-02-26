export interface AgentConfig {
    provider: "anthropic" | "openai" | "google" | "glm";
    apiKey: string;
    model: string;
    baseURL?: string;  // For GLM and other custom endpoints
}

export interface ChannelConfig {
    platform: "discord" | "slack";
    token: string;
    enabled: boolean;
}

export interface Config {
    agent: AgentConfig;
    channels: ChannelConfig[];
    logLevel: "debug" | "info" | "warn" | "error";
}