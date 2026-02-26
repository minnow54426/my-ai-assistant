import { config } from 'dotenv';
import { GLMClient } from './src/llm/glm';

config();

const client = new GLMClient({
  apiKey: process.env.GLM_API_KEY!,
  baseURL: process.env.GLM_URL!,
  model: 'glm-4.6'
});

console.log('Testing GLM client after removing system message...\n');

client.sendMessage('hello')
  .then(response => {
    console.log('✅ Success!');
    console.log('Response:', response.content);
  })
  .catch(error => {
    console.error('❌ Error:', error.message);
  });
