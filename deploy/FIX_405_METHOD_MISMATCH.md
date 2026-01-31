# 🔧 Fix 405 Errors - Method Mismatch

**Status:** Frontend already uses `method: "POST"` ✅

**Issue:** 405 errors suggest routes not registered OR path mismatch

---

## ✅ Verified: Frontend Code is Correct

All API calls already use `method: "POST"`:
- ✅ `checkCompliance` → `method: "POST"`
- ✅ `getExplainability` → `method: "POST"`
- ✅ `emitVoiceEvidence` → `method: "POST"`

**So the issue is NOT in frontend code.**

---

## 🔍 Real Issue: Routes Not Registered

**405 = Route exists but method doesn't match**

**But frontend uses POST and backend expects POST...**

**This means:** Routes aren't being registered properly on backend engines.

---

## ✅ Solution: Verify Routes Are Registered

### Step 1: Check Engine Routes on EC2

**SSH into EC2:**

```bash
ssh -i intent-platform-key.pem ubuntu@44.202.189.78

# Check if routes are registered by testing Swagger docs
curl http://127.0.0.1:7002/docs  # Compliance Engine
curl http://127.0.0.1:7006/docs  # Explainability Engine
curl http://127.0.0.1:7007/docs  # Evidence Engine
```

**If Swagger docs load:** Routes are registered ✅

**If 404:** Routes not registered ❌

### Step 2: Test Routes Directly

```bash
# Test Compliance Engine POST
curl -X POST http://127.0.0.1:7002/v1/execute \
  -H "Content-Type: application/json" \
  -d '{"intent":{"type":"BUY_PROPERTY","payload":{}}}'

# If 405: Route exists but method wrong
# If 200/500: Route works, check response
# If connection refused: Engine not running
```

### Step 3: Check PM2 Logs for Route Registration

```bash
# Check if routes are being registered
pm2 logs compliance-engine --lines 50 | grep -i "route\|register\|listening"

# Should see something like:
# "Route registered: POST /v1/execute"
# OR
# "Server listening on..."
```

---

## 🔧 If Routes Not Registered: Rebuild & Restart

**On EC2:**

```bash
cd /home/ubuntu/app/backend

# Rebuild engines (this registers routes from code)
npm run build --workspaces --if-present

# Restart engines
pm2 restart all

# Wait for startup
sleep 3

# Test again
curl -X POST http://127.0.0.1:7002/v1/execute \
  -H "Content-Type: application/json" \
  -d '{"intent":{"type":"BUY_PROPERTY"}}'
```

---

## 🔧 If Routes Registered But Still 405: Check Path

**The issue might be path mismatch:**

**Frontend calls:**
- `/api/compliance/v1/execute`
- `/api/explainability/v1/execute`
- `/api/evidence/v1/execute`

**Nginx proxies to:**
- `http://127.0.0.1:7002/v1/execute` ✅
- `http://127.0.0.1:7006/v1/execute` ✅
- `http://127.0.0.1:7007/v1/execute` ✅

**Backend expects:**
- `/v1/execute` ✅

**This should work!** But verify Nginx is stripping `/api/compliance` correctly.

---

## 🧪 Test Nginx Proxy

**On EC2:**

```bash
# Test via Nginx (should proxy correctly)
curl -X POST http://localhost/api/compliance/v1/execute \
  -H "Content-Type: application/json" \
  -d '{"intent":{"type":"BUY_PROPERTY"}}'

# Compare with direct engine call
curl -X POST http://127.0.0.1:7002/v1/execute \
  -H "Content-Type: application/json" \
  -d '{"intent":{"type":"BUY_PROPERTY"}}'
```

**If Nginx returns 405 but direct works:** Nginx config issue

**If both return 405:** Route not registered

---

## 📋 Quick Diagnostic

**Run this on EC2:**

```bash
echo "Testing Compliance Engine:"
echo "Direct:"
curl -X POST http://127.0.0.1:7002/v1/execute \
  -H "Content-Type: application/json" \
  -d '{"intent":{"type":"BUY_PROPERTY"}}' \
  -w "\nHTTP: %{http_code}\n"

echo ""
echo "Via Nginx:"
curl -X POST http://localhost/api/compliance/v1/execute \
  -H "Content-Type: application/json" \
  -d '{"intent":{"type":"BUY_PROPERTY"}}' \
  -w "\nHTTP: %{http_code}\n"
```

**Expected:** Both return 200 or JSON (not 405)

---

## ✅ Final Fix Checklist

- [ ] Frontend uses POST (already ✅)
- [ ] Engines running (check `pm2 status`)
- [ ] Routes registered (check Swagger docs)
- [ ] Nginx proxying correctly (test both direct and via Nginx)
- [ ] Engines rebuilt if routes missing (rebuild & restart)

---

**The frontend is correct - verify routes are registered on backend! 🔧**
