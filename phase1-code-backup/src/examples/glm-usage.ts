import { GLMClient } from "../llm/glm";
import { loadConfig, getDefaultConfigPath } from "../config/load";

async function main() {
  // Load configuration
  const config = loadConfig(getDefaultConfigPath());

  console.log("Provider:", config.agent.provider);
  console.log("Model:", config.agent.model);

  // Create GLM client
  const client = new GLMClient({
    apiKey: config.agent.apiKey,
    baseURL: config.agent.baseURL!,
    model: config.agent.model,
  });

  console.log("\nSending message to GLM API...");

  // Send a message
  const response = await client.sendMessage(
    "Hello! Can you introduce yourself?"
  );

  console.log("\nGLM Response:");
  console.log(response.content);
}

main().catch(console.error);
