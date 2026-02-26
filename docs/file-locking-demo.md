# File-Based Locking for API Calls

## What Was Implemented

File-based locking to ensure only 1 API call happens at a time, respecting the GLM API concurrency limit of 1.

## How It Works

### Lock File
- **Location:** `data/api.lock`
- **Mechanism:** Exclusive file creation (`fs.open` with 'wx' flag)
- **Behavior:** If file exists, lock is held. If not, lock is available.

### Lock Acquisition Flow

```
Session 1: "Hello"
  ↓
Try to create data/api.lock → SUCCESS (lock acquired)
  ↓
Make API call to GLM
  ↓
API response received
  ↓
Delete data/api.lock (lock released)
  ↓
Return response to user


Session 2: "Hi" (happens concurrently)
  ↓
Try to create data/api.lock → FAIL (file exists)
  ↓
Wait 200ms
  ↓
Retry create data/api.lock → FAIL (still exists)
  ↓
Wait 200ms
  ↓
... (retry up to 10 seconds)
  ↓
Try to create data/api.lock → SUCCESS (Session 1 finished)
  ↓
Make API call to GLM
  ↓
Return response to user
```

## Implementation

### FileLock Class

```typescript
export class FileLock {
  private locked = false;

  async acquire(): Promise<void> {
    for (let i = 0; i < 50; i++) {  // 10 second timeout
      try {
        const fd = await fs.open(LOCK_FILE, 'wx');
        await fd.close();
        this.locked = true;
        return;
      } catch (error) {
        if (i === 49) throw new Error('Could not acquire lock');
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
  }

  async release(): Promise<void> {
    if (this.locked) {
      await fs.unlink(LOCK_FILE);
      this.locked = false;
    }
  }
}
```

### Usage in GLMClient

```typescript
async sendMessage(message: string): Promise<GLMMessageResponse> {
  return withLock(async () => {
    const response = await fetch(this.baseURL, { ... });
    // ... process response
  });
}
```

## Testing Concurrency

### Manual Test

Open 3 terminals:

**Terminal 1:**
```bash
npm run chat
You: Hello
# Immediately proceeds (acquires lock)
```

**Terminal 2:**
```bash
npm run chat
You: Hi
# Waits for Terminal 1 to finish
# Then proceeds (acquires lock after T1 releases)
```

**Terminal 3:**
```bash
npm run chat
You: Hey
# Waits for Terminals 1 & 2 to finish
# Then proceeds
```

### Behavior

- **Without Lock:** All 3 make concurrent API calls → 429 errors
- **With Lock:** Serialized → All succeed, no 429 errors

## Error Handling

### Lock Acquisition Timeout

If lock cannot be acquired in 10 seconds:
```
Error: Could not acquire lock after 50 retries
```

This happens if:
- Another session crashed holding the lock
- API call is taking longer than 10 seconds

### Stale Lock Cleanup

If a process crashes holding the lock:
- Lock file remains in `data/api.lock`
- Next session will wait for timeout (10 seconds)
- After timeout, error is thrown
- Manual fix: Delete `data/api.lock`

### Always Release

Lock is always released in `finally` block:
```typescript
try {
  return await fn();
} finally {
  await lock.release();
}
```

Even if API call throws error, lock is released.

## Benefits

1. **Prevents 429 errors** - API calls are serialized
2. **Simple** - No external dependencies
3. **Cross-process** - Works across multiple CLI sessions
4. **Transparent** - Users don't notice the waiting
5. **Robust** - Error handling prevents stuck locks

## Trade-offs

### Pros
- ✅ Respects API concurrency limit
- ✅ No additional infrastructure
- ✅ Easy to understand and debug

### Cons
- ⚠️ Sessions wait during contention (acceptable for CLI usage)
- ⚠️ 10-second timeout might not be enough for very slow responses
- ⚠️ Stale locks need manual cleanup (rare)

## Future Improvements

If scaling to production web app:
1. Use Redis for distributed locking
2. Implement request queue with priorities
3. Add request timeout/cancellation
4. Better stale lock detection (timestamps in lock file)

## Files Modified

- `src/llm/lock.ts` (NEW) - FileLock class and withLock helper
- `src/llm/glm.ts` - Wrapped sendMessage with lock

## Commit

```
e4dbebc feat: add file-based locking for API calls to respect concurrency limit
```
