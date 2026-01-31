# 🔧 Fix 405 Not Allowed Errors

**Problem:** Multiple engines returning 405 (Method Not Allowed) on POST requests

**Affected:**
- `/api/compliance/v1/execute` → 405
- `/api/explainability/v1/execute` → 405
- `/api/evidence/v1/execute` → 405

---

## 🔍 Root Cause

The engines use **OpenAPI specs** to generate routes, but the routes might not be properly registered or the engines need to be restarted after deployment.

---

## ✅ Solution 1: Verify Engines Are Running

**On EC2:**

```bash
# Check PM2 status
pm2 status

# Check if engines are actually listening
sudo netstat -tlnp | grep -E ':(7002|7006|7007)'

# Check engine logs for errors
pm2 logs compliance-engine --lines 20
pm2 logs explainability-engine --lines 20
pm2 logs evidence-engine --lines 20
```

---

## ✅ Solution 2: Test Routes Directly

**On EC2, test each engine:**

```bash
# Test Compliance Engine
curl -X POST http://127.0.0.1:7002/v1/execute \
  -H "Content-Type: application/json" \
  -d '{"intent": {"type": "BUY_PROPERTY", "payload": {}}}'

# Test Explainability Engine
curl -X POST http://127.0.0.1:7006/v1/execute \
  -H "Content-Type: application/json" \
  -d '{"intent": {"type": "BUY_PROPERTY"}}'

# Test Evidence Engine
curl -X POST http://127.0.0.1:7007/v1/execute \
  -H "Content-Type: application/json" \
  -d '{"intentId": "test", "evidence": {}}'
```

**Expected:** JSON response (not 405)

**If 405:** Route not registered properly

**If connection refused:** Engine not running

---

## ✅ Solution 3: Restart Engines

**On EC2:**

```bash
cd /home/ubuntu/app/backend

# Restart all engines
pm2 restart all

# Wait a few seconds
sleep 3

# Check status
pm2 status

# Test again
curl -X POST http://127.0.0.1:7002/v1/execute \
  -H "Content-Type: application/json" \
  -d '{"intent": {"type": "BUY_PROPERTY"}}'
```

---

## ✅ Solution 4: Check Nginx Proxy Configuration

**Verify Nginx is proxying correctly:**

```bash
# Check Nginx config
sudo cat /etc/nginx/sites-available/intent-platform | grep -A 5 "compliance\|explainability\|evidence"

# Test via Nginx
curl -X POST http://localhost/api/compliance/v1/execute \
  -H "Content-Type: application/json" \
  -d '{"intent": {"type": "BUY_PROPERTY"}}'
```

**If Nginx returns 405 but direct engine works:** Nginx config issue

**If both return 405:** Engine route issue

---

## ✅ Solution 5: Check Email Service (502 Error)

**The 502 on `/api/email/v1/send` means email service isn't running:**

```bash
# Check if email service is running
pm2 status | grep email

# If not running, start it
cd /home/ubuntu/app/email-service
pm2 start server.js --name email-service --env PORT=7008
pm2 save
```

---

## 🔧 Fix Ollama RAG (Optional - Can Ignore)

**The Ollama errors are expected** - Ollama isn't needed in production. But if you want to disable the errors:

**In frontend code, the RAG adapter should gracefully handle Ollama being unavailable** (which it already does - shows warning but continues).

**To completely disable Ollama calls:**

The frontend already handles this - it shows "Ollama service is not available" but continues with engine-only analysis. This is fine.

---

## 📋 Complete Diagnostic Script

**Run this on EC2 to diagnose all issues:**

```bash
#!/bin/bash
echo "🔍 Engine Diagnostics"
echo "==================="

# 1. PM2 Status
echo ""
echo "📊 PM2 Status:"
pm2 status

# 2. Network Status
echo ""
echo "🌐 Network Status:"
sudo netstat -tlnp | grep -E ':(7001|7002|7003|7004|7005|7006|7007|7008)'

# 3. Test Health Endpoints
echo ""
echo "🏥 Health Checks:"
for port in 7001 7002 7003 7004 7005 7006 7007; do
  name=$(case $port in
    7001) echo "intent";;
    7002) echo "compliance";;
    7003) echo "decision";;
    7004) echo "action";;
    7005) echo "risk";;
    7006) echo "explainability";;
    7007) echo "evidence";;
  esac)
  
  echo -n "Port $port ($name): "
  curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:$port/v1/health 2>/dev/null && echo " ✅" || echo " ❌"
done

# 4. Test Execute Endpoints
echo ""
echo "⚙️  Execute Endpoints:"
echo -n "Compliance: "
curl -s -X POST http://127.0.0.1:7002/v1/execute \
  -H "Content-Type: application/json" \
  -d '{"intent":{"type":"BUY_PROPERTY"}}' \
  -w "HTTP %{http_code}" -o /dev/null
echo ""

echo -n "Explainability: "
curl -s -X POST http://127.0.0.1:7006/v1/execute \
  -H "Content-Type: application/json" \
  -d '{"intent":{"type":"BUY_PROPERTY"}}' \
  -w "HTTP %{http_code}" -o /dev/null
echo ""

echo -n "Evidence: "
curl -s -X POST http://127.0.0.1:7007/v1/execute \
  -H "Content-Type: application/json" \
  -d '{"intentId":"test"}' \
  -w "HTTP %{http_code}" -o /dev/null
echo ""

# 5. Check Email Service
echo ""
echo "📧 Email Service:"
pm2 status | grep email || echo "❌ Not running"
curl -s http://127.0.0.1:7008/health 2>/dev/null && echo "✅ Running" || echo "❌ Not responding"

# 6. Check Recent Errors
echo ""
echo "📋 Recent PM2 Errors:"
pm2 logs --err --lines 5 --nostream
```

---

## 🎯 Expected Results After Fix

- ✅ `/api/compliance/v1/execute` → 200 OK (not 405)
- ✅ `/api/explainability/v1/execute` → 200 OK (not 405)
- ✅ `/api/evidence/v1/execute` → 200 OK (not 405)
- ✅ `/api/email/v1/send` → 200 OK (not 502)
- ⚠️ Ollama errors → Can ignore (expected)

---

**Run the diagnostic script first to identify the exact issues! 🔍**
