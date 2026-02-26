import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.GLM_URL;
const apiKey = process.env.GLM_API_KEY;

console.log('Testing GLM API...');
console.log('URL:', url);
console.log('API Key:', apiKey ? apiKey.substring(0, 10) + '...' : 'MISSING');

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  },
  body: JSON.stringify({
    model: 'glm-4.6',
    messages: [{ role: 'user', content: 'hello' }]
  })
})
.then(res => {
  console.log('Status:', res.status, res.statusText);
  return res.text();
})
.then(text => {
  console.log('Response:', text);
})
.catch(err => {
  console.error('Error:', err.message);
});
