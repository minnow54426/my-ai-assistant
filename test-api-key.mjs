import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GLM_API_KEY;
const url = process.env.GLM_URL;

console.log('Testing API key validity...');
console.log('API Key:', apiKey.substring(0, 20) + '...');
console.log('URL:', url);

// Try a minimal request
fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  },
  body: JSON.stringify({
    model: 'glm-4.6',
    messages: [{ role: 'user', content: 'hi' }]
  })
})
.then(res => {
  console.log('Status:', res.status);
  return res.json();
})
.then(data => {
  console.log('Full response:', JSON.stringify(data, null, 2));
})
.catch(err => {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
});
