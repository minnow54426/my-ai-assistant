# Testing Chat with Multiple Terminals

## Option 1: Automated Test (Quick)

Run the automated test script:

```bash
./test-concurrent.sh
```

This will:
- Start 3 concurrent "chat sessions"
- Each sends a message to the GLM API
- Verify they execute sequentially (not concurrently)
- Show timestamps proving serialization

**Expected Output:**
```
Session 1: Sending 'Hello from session 1' at 17:50:23
Session 2: Sending 'Hello from session 2' at 17:50:23
Session 3: Sending 'Hello from session 3' at 17:50:23

Session 1: Response received at 2026-02-26T09:50:27.123Z  (4 seconds)
Session 2: Response received at 2026-02-26T09:50:31.456Z  (8 seconds)
Session 3: Response received at 2026-02-26T09:50:35.789Z  (12 seconds)
```

**Key Indicators:**
- ✅ All start at same time
- ✅ Complete sequentially (4s apart)
- ✅ No 429 errors

---

## Option 2: Manual Testing (Interactive)

### Step 1: Open 3 Terminal Windows

Open 3 separate terminal windows in the project directory.

### Step 2: Start Chat in Each Terminal

**Terminal 1:**
```bash
npm run chat
```

**Terminal 2:**
```bash
npm run chat
```

**Terminal 3:**
```bash
npm run chat
```

### Step 3: Send Messages Concurrently

In each terminal, type a message and press Enter **as quickly as possible**:

**Terminal 1:**
```
You: Hello from terminal 1
```

**Terminal 2:**
```
You: Hi from terminal 2
```

**Terminal 3:**
```
You: Hey from terminal 3
```

### Step 4: Observe the Behavior

**What You Should See:**

1. **First terminal** starts immediately
2. **Second terminal** waits (no immediate response)
3. **Third terminal** waits (no immediate response)
4. After ~5 seconds, first terminal gets response
5. Second terminal then starts processing
6. Third terminal waits for second to finish

**Example Timing:**
```
Time 0s:  T1: "Hello from terminal 1" → (acquires lock)
Time 0s:  T2: "Hi from terminal 2"    → (waits for lock)
Time 0s:  T3: "Hey from terminal 3"  → (waits for lock)
Time 5s:  T1: Assistant: "..."       → (releases lock)
Time 5s:  T2: (acquires lock)        → (starts processing)
Time 10s: T2: Assistant: "..."       → (releases lock)
Time 10s: T3: (acquires lock)        → (starts processing)
Time 15s: T3: Assistant: "..."       → (done)
```

### Step 5: Verify Lock File

While test is running, check lock file in another terminal:

```bash
# Watch lock file
watch -n 0.1 'ls -la data/api.lock 2>/dev/null || echo "No lock file"'
```

You'll see:
- Lock file appears when API call starts
- Lock file disappears when API call finishes

---

## Option 3: Quick Verification

Just check if the locking code is in place:

```bash
grep -n "withLock" src/llm/glm.ts
```

Expected output:
```typescript
import { withLock } from './lock';
...
return withLock(async () => {
  const response = await fetch(this.baseURL, {
```

---

## What to Look For

### ✅ Working Correctly (Good)

- Messages process **sequentially** (one at a time)
- No `429 Too Many Requests` errors
- Second/third terminals wait for first to finish
- Total time = sum of all requests (e.g., 3 requests × 5s = 15s)

### ❌ Not Working (Bad)

- Messages process **concurrently** (all at once)
- See `429 Too Many Requests` errors
- Multiple terminals respond at same time
- Random failures

---

## Cleanup After Testing

```bash
# Remove test memory file
rm -f data/test-concurrent.json

# Remove lock file (if it exists)
rm -f data/api.lock

# Remove test script
rm -f test-concurrent.sh
```

---

## Troubleshooting

### Lock File Stuck

If lock file exists and won't go away:

```bash
rm -f data/api.lock
```

This can happen if a process crashed while holding the lock.

### All Tests Fail with 429

If you still see 429 errors:
1. Check lock file exists: `ls -la data/api.lock`
2. Check locking code is in place: `grep "withLock" src/llm/glm.ts`
3. Try running tests one at a time to confirm

### Nothing Happens

If messages don't get responses:
1. Check API key is correct: `cat .env`
2. Check API URL is correct: `cat .env`
3. Try single terminal first to ensure basic functionality works

---

## Expected Test Results

**Without Locking (OLD behavior):**
```
T1: Response (5s) ← concurrent
T2: Response (5s) ← concurrent
T3: Response (5s) ← concurrent
Total: 5s, but 2 get 429 errors
```

**With Locking (NEW behavior):**
```
T1: Response (5s)
T2: Response (5s) ← waits for T1
T3: Response (5s) ← waits for T2
Total: 15s, all succeed
```

The trade-off: Slower overall, but all requests succeed! 🎯
