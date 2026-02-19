import { loadConfig, getDefaultConfigPath } from "./load";

try {
    const configPath = getDefaultConfigPath();
    console.log(`Loading config from: ${configPath}`);

    const config = loadConfig(configPath);

    console.log("Config loaded successfully");
    console.log("Agent provider: ", config.agent.provider);
    console.log("Model: ", config.agent.model);
    console.log("API Key: ", config.agent.apiKey ? `${config.agent.apiKey.slice(0, 8)}...` : "not set");
    console.log("Base URL: ", config.agent.baseURL || "not set");
    console.log("Channels: ", config.channels.length);
    console.log("Log level: ", config.logLevel);
} catch (error) {
    console.error("Error loading config: ", error);
}