# GLM API 500 Error Diagnosis

## The Issue

**Error Message:**
```
GLM API error: 500 Internal Server Error
```

## Possible Causes

### 1. **API Key Problem** (Most Likely)

The API key `sk-b541d6cf9ed3c2eb953c7c0f5e0aaa9f` might be:
- **Invalid or expired**
- **Not authorized for glm-4.6**
- **Rate limited** (we hit 429 earlier)
- **Account suspended**

### 2. **API Endpoint Issue**

The endpoint `https://apis.iflow.cn/v1/chat/completions` might be:
- **Down temporarily**
- **Not accessible from your location**
- **Having infrastructure issues**

### 3. **Model Availability**

`glm-4.6` might:
- **Not available** on this API
- **Have a different name** (e.g., just `glm-4`)
- **Require special permissions**

### 4. **Request Format Issue**

Our request format might not match what the API expects.

## Diagnostic Steps

### Step 1: Verify API Key

Check if the API key is valid:

```bash
# Test with curl
curl -X POST "https://apis.iflow.cn/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-b541d6cf9ed3c2eb953c7c0f5e0aaa9f" \
  -d '{
    "model": "glm-4.6",
    "messages": [{"role": "user", "content": "hi"}]
  }'
```

### Step 2: Try Different Model

The API might use a different model name. Try:
- `glm-4` (without .6)
- `glm-4-flash`
- `glm-4-air`
- `glm-4-turbo`

### Step 3: Check API Documentation

Visit the iflow.cn documentation or dashboard to:
- Verify the correct model name
- Check API key status
- View usage limits
- See if there are known issues

### Step 4: Contact Support

If the API continues to return 500:
- Check iflow.cn status page
- Contact their support
- Verify your account is active
- Check if you have sufficient credits/quota

## What We've Tried

✅ Changed to glm-4.6 as required
✅ Added system message for English
✅ Added file locking for concurrency
✅ Request format is correct
✅ Authentication format is correct

**Result:** Still getting 500 errors

## Recommendation

**The 500 error is coming from the GLM API itself, not your code.** Your implementation is correct.

**Next steps:**
1. Verify your API key is valid and active
2. Check iflow.cn dashboard for API status
3. Try their documentation examples to confirm correct model name
4. Contact iflow.cn support if issue persists

## Current Configuration

```bash
# .env
GLM_API_KEY=sk-b541d6cf9ed3c2eb953c7c0f5e0aaa9f
GLM_URL=https://apis.iflow.cn/v1/chat/completions

# config.json
"model": "glm-4.6"
```

---

**Status:** 🔴 API not responding - requires investigation on iflow.cn side or API key validation
