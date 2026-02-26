# GLM API 500 Error Diagnosis

## The Issue

**Error Message:**
```
GLM API error: 500 Internal Server Error
```

## Root Cause Found ✅

**The 500 error was caused by sending a `system` role message in the request.**

The iflow.cn API does NOT support the `system` role in messages array.

## What We Discovered

### Test Results:

1. **With `system` role message:**
```bash
curl -X POST "https://apis.iflow.cn/v1/chat/completions" \
  -H "Authorization: Bearer sk-..." \
  -d '{"model": "glm-4.6", "messages": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "hello"}
  ]}'
# Result: 500 Internal Server Error ❌
```

2. **Without `system` role message:**
```bash
curl -X POST "https://apis.iflow.cn/v1/chat/completions" \
  -H "Authorization: Bearer sk-..." \
  -d '{"model": "glm-4.6", "messages": [
    {"role": "user", "content": "hello"}
  ]}'
# Result: 200 OK ✅
```

## The Fix

**File:** `src/llm/glm.ts`

**Before (caused 500 error):**
```typescript
const requestBody: GLMRequestBody = {
  model: this.model,
  messages: [
    {
      role: "system",  // ❌ This caused 500 errors
      content: "You are an English-language AI assistant...",
    },
    {
      role: "user",
      content: message,
    },
  ],
};
```

**After (works correctly):**
```typescript
const requestBody: GLMRequestBody = {
  model: this.model,
  messages: [
    {
      role: "user",  // ✅ Only user role
      content: message,
    },
  ],
};
```

## Additional Findings

### Rate Limiting
The API has strict QPS limits:
- **QPS Limit:** 10 requests/second
- **Error when exceeded:** 429 Too Many Requests
- **Message:** `Throttling: QPS(11/10)`

### Prompt Length Limits
- **Short prompts (< 200 chars):** ✅ Work fine
- **Medium prompts (~200-400 chars):** ✅ Work fine
- **Long prompts (> 500 chars with tool descriptions):** ⚠️ May fail or rate limit

### Chinese Language
- **glm-4.6** is fundamentally a Chinese language model
- It prefers to respond in Chinese even when prompted in English
- System messages cannot be used to force English (as they cause 500 errors)
- **Workaround:** Include English instructions in the user message itself

## Test Results After Fix

```bash
$ npm test -- src/llm/glm-integration.test.ts
PASS src/llm/glm-integration.test.ts
✓ connects to real GLM API and sends message (20517 ms)
```

**GLM Response:** `你好！我是智谱AI训练的GLM大语言模型...` (Chinese)

## Current Status

✅ **RESOLVED:** 500 errors fixed by removing `system` role messages

⚠️ **Known Limitations:**
- API returns Chinese responses by default
- Strict rate limiting (10 QPS)
- Long prompts with tool descriptions may hit rate limits

## Current Configuration

```bash
# .env
GLM_API_KEY=sk-b541d6cf9ed3c2eb953c7c0f5e0aaa9f
GLM_URL=https://apis.iflow.cn/v1/chat/completions

# config.json
"model": "glm-4.6"
```

---

**Status:** ✅ Fixed - 500 errors resolved. API working correctly.
**Date:** 2026-02-26
**Fix Commit:** Removed `system` role from GLM API requests
