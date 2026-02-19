import { GLMClient } from "./glm";
import { loadConfig, getDefaultConfigPath } from "../config/load";

describe("GLMClient Integration", () => {
  it("connects to real GLM API and sends message", async () => {
    const config = loadConfig(getDefaultConfigPath());

    if (config.agent.provider !== "glm") {
      console.log("Skipping GLM integration test - provider is not glm");
      return;
    }

    const client = new GLMClient({
      apiKey: config.agent.apiKey,
      baseURL: config.agent.baseURL!,
      model: config.agent.model,
    });

    const response = await client.sendMessage("Say 'Hello, integration test!'");

    console.log("GLM Response:", response.content);
    expect(response.content).toBeDefined();
    expect(typeof response.content).toBe("string");
    expect(response.content.length).toBeGreaterThan(0);
  }, 30000);
});
