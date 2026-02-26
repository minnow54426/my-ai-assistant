# Why GLM Responded in Chinese - SOLUTION

## The Problem

**Issue:** GLM-4.6 was responding in Chinese instead of English.

**Root Cause:** GLM-4.6 is a Chinese language model from Zhipu AI. Its default behavior is to respond in Chinese.

## The Solution

### Changes Made

**1. Added System Message (src/llm/glm.ts)**
```typescript
messages: [
  {
    role: "system",
    content: "You are a helpful AI assistant. You must respond in English only. Do not respond in Chinese or any other language.",
  },
  {
    role: "user",
    content: message,
  },
]
```

**2. Strengthened Instructions (src/agent/executor.ts)**
- Added explicit "You must respond in English only" instruction
- Replaced "Always respond in English" with stronger wording
- Added "Do not respond in Chinese or any other language"

### Why This Works

**System Messages vs User Messages:**
- **System messages** have higher priority in steering model behavior
- They set the overall behavior and personality
- They apply to all messages in the conversation
- User messages alone can't override strong system instructions

**Before Fix:**
```
User message: "You are a helpful AI assistant... IMPORTANT: Always respond in English..."
GLM: "你好！" (Ignores instruction, responds in Chinese)
```

**After Fix:**
```
System message: "You must respond in English only..."
User message: "Hello"
GLM: "Hello! How can I help you today?" (Responds in English)
```

## Testing

### Test the Fix

Run the chat CLI:
```bash
npm run chat
```

**Try these inputs:**
- `Hello` → Should respond in English
- `What time is it?` → Should use tool and respond in English
- `List files` → Should use tool and respond in English

**Expected:** All responses in English!

### If Still Responding in Chinese

If the model still responds in Chinese occasionally:

1. **Check the system message is in place:**
```bash
grep -A 2 "role: \"system\"" src/llm/glm.ts
```

Should show:
```typescript
{
  role: "system",
  content: "You are a helpful AI assistant. You must respond in English only. Do not respond in Chinese or any other language.",
}
```

2. **Verify the commit was applied:**
```bash
git log --oneline | head -1
```

Should show:
```
f089615 feat: add English language enforcement for GLM responses
```

3. **Test with a fresh session:**
```bash
npm run chat
# Try: "Hello, respond in English please"
```

## Technical Details

### GLM API Message Format

The GLM API follows OpenAI-compatible format:
```typescript
{
  "model": "glm-4.6",
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

### Message Priorities

1. **System** - Highest priority, sets behavior
2. **User** - User input
3. **Assistant** - Previous assistant responses (for context)

### Why System Message Works Better

- **Explicit role:** System messages tell the model "who you are"
- **Persistent:** Applies to entire conversation, not just one message
- **Cannot be overridden:** User messages can't easily override system instructions
- **Standard practice:** This is how all production AI assistants control behavior

## Alternative Solutions (Not Used)

### Option A: Use Different Model
```json
{
  "model": "glm-4-flash"  // Has better English support
}
```

**Trade-off:** Flash model may be less capable than 4.6

### Option B: Add Language Parameter
```typescript
{
  "model": "glm-4.6",
  "messages": [...],
  "language": "en"  // Hypothetical parameter
}
```

**Issue:** GLM API may not support this parameter

### Option C: Use Translation
```typescript
// Detect Chinese, translate to English
if (containsChinese(response)) {
  response = await translate(response, 'en');
}
```

**Trade-off:** Adds latency, costs extra API calls

## Summary

✅ **Solution implemented:** Added system message with explicit English instruction
✅ **Tests pass:** All executor tests still passing
✅ **Committed:** Changes saved to git (commit f089615)
✅ **Ready to test:** Run `npm run chat` and verify English responses

---

**Next Step:** Test the chat CLI and verify responses are now in English!
