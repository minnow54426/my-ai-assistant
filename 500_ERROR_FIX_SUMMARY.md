# GLM API 500 Error - Fix Summary

## Issue Resolved ✅

The GLM API was returning `500 Internal Server Error` for all requests.

## Root Cause

The iflow.cn API does NOT support `system` role messages in the request body.

## Fix Applied

**File:** `src/llm/glm.ts`

Removed the `system` role message from the API request:

```typescript
// BEFORE (caused 500 errors):
messages: [
  { role: "system", content: "You are an English-language AI assistant..." },
  { role: "user", content: message }
]

// AFTER (works correctly):
messages: [
  { role: "user", content: message }
]
```

## Verification

```bash
$ curl test
✅ Simple message: 200 OK
❌ With system role: 500 Error

$ npm test -- src/llm/glm-integration.test.ts
✅ GLM integration test: PASS

$ npm run chat
✅ Chat interface working
```

## API Characteristics

The iflow.cn GLM API has these characteristics:

1. **No System Role Support** - Causes 500 errors
2. **Chinese Language Model** - Responds in Chinese by default
3. **Rate Limiting** - 10 QPS limit (causes 429 errors)
4. **Intermittent Issues** - API may temporarily return 500 errors

## Recommendations

1. **For English responses:** Include English instructions in the user message itself
2. **For rate limiting:** File locking is implemented (concurrency limit of 1)
3. **For stability:** Consider adding retry logic for transient 500 errors

## Files Changed

- `src/llm/glm.ts` - Removed system role message
- `CLAUDE.md` - Documented API limitations
- `GLM_API_500_ERROR.md` - Full diagnostic documentation (later removed)

## Commit

```
b491191 fix: remove system role from GLM API requests
```

---

**Status:** ✅ Fixed and tested
**Date:** 2026-02-26
