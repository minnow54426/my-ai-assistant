import { GLMClient } from './src/llm/glm.js';
import dotenv from 'dotenv';

dotenv.config();

const client = new GLMClient({
  apiKey: process.env.GLM_API_KEY,
  baseURL: process.env.GLM_URL,
  model: 'glm-4.6'
});

console.log('Testing GLM client after removing system message...\n');

try {
  const response = await client.sendMessage('hello');
  console.log('✅ Success!');
  console.log('Response:', response.content);
} catch (error) {
  console.error('❌ Error:', error.message);
}
