# 🔧 Debug Backend Errors

**Status:** ✅ Engines are running! (No more 502 errors)

**New Issues:** Backend code errors need fixing

---

## ✅ What's Working

- ✅ Engines are running (no 502 Bad Gateway)
- ✅ Frontend using `/api/...` paths correctly
- ✅ No CORS errors
- ✅ Nginx proxying correctly

---

## ❌ Current Errors

### 1. 500 Internal Server Error - Intent Engine

**Error:**
```
POST /api/intent/v1/execute → 500
"Cannot read properties of undefined (reading 'complianceStatus')"
```

**Cause:** Backend code trying to access `complianceStatus` from undefined object

**Fix:** Check backend logs on EC2

### 2. 404 Not Found - Decision Engine

**Error:**
```
GET /api/decision/v1/intent/resume → 404
"Route GET:/v1/intent/resume not found"
```

**Cause:** Route doesn't exist or path is wrong

**Fix:** Check decision engine routes

### 3. 405 Not Allowed - Explainability Engine

**Error:**
```
POST /api/explainability/v1/execute → 405
```

**Cause:** HTTP method mismatch or route configuration issue

**Fix:** Check explainability engine routes

---

## 🔍 Debug Steps on EC2

### Step 1: Check PM2 Logs

**SSH into EC2:**

```bash
ssh -i intent-platform-key.pem ubuntu@44.202.189.78

# Check all logs
pm2 logs --lines 50

# Check specific engine logs
pm2 logs intent-engine --lines 50
pm2 logs decision-engine --lines 50
pm2 logs explainability-engine --lines 50
```

### Step 2: Test Health Endpoints

```bash
# Test direct engine access
curl http://127.0.0.1:7001/v1/health
curl http://127.0.0.1:7003/v1/health
curl http://127.0.0.1:7006/v1/health

# Test via Nginx
curl http://localhost/api/intent/v1/health
curl http://localhost/api/decision/v1/health
curl http://localhost/api/explainability/v1/health
```

### Step 3: Check Engine Routes

```bash
# Check available routes (if engines have /docs endpoint)
curl http://127.0.0.1:7001/docs
curl http://127.0.0.1:7003/docs
curl http://127.0.0.1:7006/docs
```

### Step 4: Test Intent Engine Directly

```bash
# Test intent engine with a simple request
curl -X POST http://127.0.0.1:7001/v1/execute \
  -H "Content-Type: application/json" \
  -d '{"intent": {"type": "BUY_PROPERTY"}}'
```

---

## 🔧 Common Fixes

### Fix 1: Intent Engine 500 Error

**The error suggests missing compliance data. Check:**

1. **Backend logs:**
   ```bash
   pm2 logs intent-engine --lines 100
   ```

2. **Check if compliance engine is running:**
   ```bash
   pm2 status
   curl http://127.0.0.1:7002/v1/health
   ```

3. **The intent engine might be calling compliance engine before it's ready**

### Fix 2: Decision Engine 404

**The route `/v1/intent/resume` might not exist. Check:**

1. **Decision engine routes:**
   ```bash
   # Check decision engine OpenAPI spec
   cat /home/ubuntu/app/backend/services/decision-engine/openapi.yaml | grep -A 5 "resume"
   ```

2. **The frontend might be calling wrong endpoint**

### Fix 3: Explainability Engine 405

**405 = Method not allowed. Check:**

1. **Verify the route accepts POST:**
   ```bash
   # Check explainability engine routes
   curl -X GET http://127.0.0.1:7006/docs
   ```

2. **Check Nginx proxy configuration:**
   ```bash
   sudo cat /etc/nginx/sites-available/intent-platform | grep explainability
   ```

---

## 📝 Quick Diagnostic Commands

**Run these on EC2 to get full picture:**

```bash
# 1. Check all engines are running
pm2 status

# 2. Check engine logs for errors
pm2 logs --err --lines 20

# 3. Check if engines are listening
sudo netstat -tlnp | grep -E ':(7001|7002|7003|7004|7005|7006|7007)'

# 4. Test each engine health
for port in 7001 7002 7003 7004 7005 7006 7007; do
  echo "Testing port $port:"
  curl -s http://127.0.0.1:$port/v1/health || echo "Failed"
  echo ""
done

# 5. Check Nginx error log
sudo tail -20 /var/log/nginx/error.log
```

---

## 🎯 Expected vs Actual

| Endpoint | Expected | Actual | Status |
|----------|----------|--------|--------|
| `/api/intent/v1/health` | 200 OK | ? | Check |
| `/api/intent/v1/execute` | 200 OK | 500 Error | ❌ Code issue |
| `/api/decision/v1/health` | 200 OK | ? | Check |
| `/api/decision/v1/intent/resume` | 200 OK | 404 Not Found | ❌ Route issue |
| `/api/explainability/v1/execute` | 200 OK | 405 Not Allowed | ❌ Method issue |

---

## ✅ Next Steps

1. **SSH into EC2 and run diagnostic commands above**
2. **Check PM2 logs for detailed error messages**
3. **Share the logs so we can identify the exact issues**
4. **Fix backend code based on error messages**

---

**The good news: Your deployment architecture is correct! These are just backend code bugs that need fixing. 🚀**
