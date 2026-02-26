/**
 * Simple demonstration of file-based locking
 * Run this with: node test-lock.js
 */

const fs = require('fs');
const path = require('path');

const LOCK_FILE = path.join(__dirname, 'data', 'test.lock');
const MAX_RETRIES = 10;
const RETRY_DELAY = 1000;

async function acquireLock(sessionName) {
  console.log(`[${sessionName}] Trying to acquire lock at ${new Date().toISOString()}`);

  const dataDir = path.dirname(LOCK_FILE);
  await fs.promises.mkdir(dataDir, { recursive: true });

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const fd = await fs.promises.open(LOCK_FILE, 'wx');
      await fd.close();
      console.log(`[${sessionName}] Lock ACQUIRED at ${new Date().toISOString()}`);
      return true;
    } catch (error) {
      if (i === MAX_RETRIES - 1) {
        console.log(`[${sessionName}] Failed to acquire lock after ${MAX_RETRIES} retries`);
        return false;
      }
      console.log(`[${sessionName}] Lock held, waiting ${RETRY_DELAY}ms... (${i + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
}

async function releaseLock(sessionName) {
  try {
    await fs.promises.unlink(LOCK_FILE);
    console.log(`[${sessionName}] Lock RELEASED at ${new Date().toISOString()}`);
  } catch (error) {
    console.log(`[${sessionName}] Lock already released or missing`);
  }
}

async function simulateSession(sessionName, duration) {
  console.log(`\n=== ${sessionName} Starting ===\n`);

  // Acquire lock
  const acquired = await acquireLock(sessionName);
  if (!acquired) {
    console.log(`[${sessionName}] Could not acquire lock, giving up`);
    return;
  }

  // Simulate API call
  console.log(`[${sessionName}] Making API call (taking ${duration}ms)...`);
  await new Promise(resolve => setTimeout(resolve, duration));
  console.log(`[${sessionName}] API call complete`);

  // Release lock
  await releaseLock(sessionName);
  console.log(`\n=== ${sessionName} Complete ===\n`);
}

// Run 3 sessions concurrently with different timings
async function runTest() {
  console.log('Starting concurrent session test...');
  console.log('Expected: Sessions execute sequentially (one after another)');
  console.log('');

  // Clean up any existing lock
  try { await fs.promises.unlink(LOCK_FILE); } catch {}

  // Start all sessions at the same time
  await Promise.all([
    simulateSession('Session 1', 3000),  // 3 second "API call"
    simulateSession('Session 2', 2000),  // 2 second "API call"
    simulateSession('Session 3', 1000),  // 1 second "API call"
  ]);

  console.log('\n✅ All sessions complete!');
  console.log('\nNotice how:');
  console.log('- All sessions started at same time');
  console.log('- Each session waited for the lock');
  console.log('- Sessions executed sequentially (1 → 2 → 3)');
  console.log('- Total time ≈ 6 seconds (3s + 2s + 1s)');
}

runTest().catch(console.error);
