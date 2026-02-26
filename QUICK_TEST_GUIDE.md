# Quick Test Guide - Multiple Terminals

## Automated Test (Just Ran) ✅

```bash
node test-lock.js
```

**Result:** Perfect! Sessions executed sequentially (6 seconds total for 3 concurrent sessions).

---

## Manual Testing with Real Chat

### Step 1: Open 3 Terminals

Open 3 terminal windows in: `/Users/boycrypt/code/typescript/my-assistant`

### Step 2: Start Chat in Each

**Terminal 1, 2, 3:**
```bash
npm run chat
```

You'll see in each:
```
=== AI Assistant with Shared Memory ===
All sessions share the same memory context.
Memory: {"totalMessages":0,"recentCount":0,"summaryCount":0,"lastUpdated":"..."}
...
You:
```

### Step 3: Send Messages Concurrently

**Quickly type in each terminal and press Enter:**

**Terminal 1:**
```
You: test one
```

**Terminal 2:**
```
You: test two
```

**Terminal 3:**
```
You: test three
```

### Step 4: Watch the Behavior

**What will happen:**

1. **Terminal 1** will start immediately (acquires lock)
2. **Terminal 2** will wait (no immediate response)
3. **Terminal 3** will wait (no immediate response)
4. After ~3-5 seconds, **Terminal 1** gets response
5. Then **Terminal 2** starts processing
6. After ~3-5 seconds, **Terminal 2** gets response
7. Then **Terminal 3** starts processing
8. After ~3-5 seconds, **Terminal 3** gets response

**Total time:** ~15-18 seconds (3 requests × ~5 seconds each)

### Step 5: Verify Memory is Shared

In **Terminal 1**, after getting response:
```
You: /stats
```

You should see something like:
```
Memory Statistics:
  Total messages: 6  (3 user + 3 assistant across all sessions)
  Recent messages: 6
  Summaries: 0
```

This proves all 3 sessions are sharing the same memory!

---

## What This Proves

✅ **File locking works** - Sessions execute sequentially
✅ **No 429 errors** - API concurrency limit respected
✅ **Shared memory works** - All sessions see same conversation history
✅ **User experience** - Slight waiting, but all requests succeed

---

## Lock File Inspection (Optional)

While running chat in multiple terminals, check lock file in another terminal:

```bash
# Terminal 4: Watch lock file
watch -n 0.5 'ls -la data/api.lock 2>/dev/null || echo "No lock"'
```

You'll see lock file appear and disappear as API calls are made.

---

## Cleanup

```bash
# Remove test files when done
rm -f test-lock.js test-concurrent.sh
rm -f data/test-concurrent.json
```
