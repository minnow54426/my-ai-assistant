import { AgentExecutor } from './src/agent/executor';
import { GLMClient } from './src/llm/glm';
import { ToolRegistry } from './src/agent/tools';
import { getTimeTool } from './src/agent/built-in-tools';
import { loadConfig, getDefaultConfigPath } from './src/config/load';

async function test() {
  const config = loadConfig(getDefaultConfigPath());
  const glmClient = new GLMClient({
    apiKey: config.agent.apiKey,
    baseURL: config.agent.baseURL!,
    model: config.agent.model,
  });

  const tools = new ToolRegistry();
  tools.register(getTimeTool);

  const agent = new AgentExecutor({ llmClient: glmClient, tools });

  console.log('\n=== Testing get-time tool ===\n');
  const response = await agent.processMessage('What time is it?');
  console.log('\n=== Final Response to User ===');
  console.log(response);
  console.log('\n=== End ===\n');
}

test().catch(console.error);
