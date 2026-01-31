# 🚨 URGENT: Fix ALL 405 Errors - Nginx Path Stripping

**Status:** You're getting 405 errors on ALL engines because Nginx isn't stripping the `/api/...` prefix.

**Affected Engines:**
- ❌ `/api/evidence/v1/execute` → 405
- ❌ `/api/risk/v1/execute` → 405  
- ❌ `/api/action/v1/execute` → 405
- ❌ `/api/explainability/v1/execute` → 405
- ❌ `/api/compliance/v1/execute` → 405

**Root Cause:** Nginx forwards `/api/action/v1/execute` to backend, but backend only has route `/v1/execute`.

---

## ✅ QUICK FIX (Choose One)

### Option 1: Automated Script (FASTEST)

```bash
# Upload script to EC2
scp -i intent-platform-key.pem \
  deploy/nginx-fix.sh \
  ubuntu@44.202.189.78:/home/ubuntu/

# SSH and run
ssh -i intent-platform-key.pem ubuntu@44.202.189.78
chmod +x nginx-fix.sh
./nginx-fix.sh
```

**Done!** Script will:
- Backup current config
- Add `rewrite` rules for ALL engines
- Test and reload Nginx
- Test routes automatically

---

### Option 2: Manual Fix (If script doesn't work)

**SSH into EC2:**

```bash
ssh -i intent-platform-key.pem ubuntu@44.202.189.78
sudo nano /etc/nginx/sites-available/intent-platform
```

**Find each `location /api/...` block and add `rewrite` line:**

```nginx
# Intent Engine
location /api/intent {
    rewrite ^/api/intent(.*)$ $1 break;  # ← ADD THIS
    proxy_pass http://127.0.0.1:7001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
}

# Compliance Engine
location /api/compliance {
    rewrite ^/api/compliance(.*)$ $1 break;  # ← ADD THIS
    proxy_pass http://127.0.0.1:7002;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
}

# Decision Engine
location /api/decision {
    rewrite ^/api/decision(.*)$ $1 break;  # ← ADD THIS
    proxy_pass http://127.0.0.1:7003;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
}

# Action Engine
location /api/action {
    rewrite ^/api/action(.*)$ $1 break;  # ← ADD THIS
    proxy_pass http://127.0.0.1:7004;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
}

# Risk Engine
location /api/risk {
    rewrite ^/api/risk(.*)$ $1 break;  # ← ADD THIS
    proxy_pass http://127.0.0.1:7005;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
}

# Explainability Engine
location /api/explainability {
    rewrite ^/api/explainability(.*)$ $1 break;  # ← ADD THIS
    proxy_pass http://127.0.0.1:7006;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
}

# Evidence Engine
location /api/evidence {
    rewrite ^/api/evidence(.*)$ $1 break;  # ← ADD THIS
    proxy_pass http://127.0.0.1:7007;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
}

# Email Service
location /api/email {
    rewrite ^/api/email(.*)$ $1 break;  # ← ADD THIS
    proxy_pass http://127.0.0.1:7008;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
}
```

**Save and reload:**

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🧪 Verify Fix

**Test on EC2:**

```bash
# Test Action Engine (the one failing most)
curl -X POST http://localhost/api/action/v1/execute \
  -H "Content-Type: application/json" \
  -d '{"intent":"test","decisionsCount":1}'

# Should return JSON (200) or error JSON (500), NOT 405
```

**In browser:** Refresh page - 405 errors should be gone!

---

## 📋 Other Issues (Non-Critical)

1. **Keycloak Web Crypto API Error:**
   - This is because you're on HTTP (not HTTPS)
   - App falls back to mock auth ✅ (working)

2. **Email Not Sending:**
   - `userEmail: null` - No email in Keycloak token
   - This is expected with mock auth
   - Will work when real Keycloak is configured

3. **Ollama Errors:**
   - Expected - Ollama not deployed
   - App handles gracefully ✅

---

## ✅ After Fix

**You should see:**
- ✅ No more 405 errors
- ✅ Action Engine works
- ✅ Risk Engine works
- ✅ Evidence Engine works
- ✅ All engines responding

**Run the script now - it takes 30 seconds! 🚀**
