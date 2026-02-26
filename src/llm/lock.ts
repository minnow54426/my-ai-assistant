import * as fs from 'fs/promises';
import * as path from 'path';

const LOCK_FILE = path.join(process.cwd(), 'data', 'api.lock');
const MAX_RETRIES = 50; // 50 * 200ms = 10 second timeout
const RETRY_DELAY = 200; // 200ms between retries

export class FileLock {
  private locked = false;

  /**
   * Acquire lock with retry logic
   * Throws error if lock cannot be acquired
   */
  async acquire(): Promise<void> {
    const dataDir = path.dirname(LOCK_FILE);

    // Ensure data directory exists
    await fs.mkdir(dataDir, { recursive: true });

    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        // Try to create lock file exclusively (fails if exists)
        const fd = await fs.open(LOCK_FILE, 'wx');
        await fd.close();
        this.locked = true;
        return;
      } catch (error: any) {
        if (i === MAX_RETRIES - 1) {
          throw new Error(`Could not acquire lock after ${MAX_RETRIES} retries`);
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }

  /**
   * Release lock
   */
  async release(): Promise<void> {
    if (this.locked) {
      try {
        await fs.unlink(LOCK_FILE);
      } catch (error) {
        // Lock file might have been cleaned up already
        console.warn('Failed to release lock:', error);
      }
      this.locked = false;
    }
  }
}

/**
 * Execute function with lock acquired
 */
export async function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const lock = new FileLock();
  await lock.acquire();
  try {
    return await fn();
  } finally {
    await lock.release();
  }
}
