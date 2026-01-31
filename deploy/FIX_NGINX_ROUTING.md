# 🔧 Fix Nginx Routing - Verify Decision Engine Route

**Status:** Frontend is already using `DECISION_ENGINE_URL` correctly ✅

**Issue:** 404 on `/api/decision/v1/intent/resume` = Route might not exist OR Nginx not routing correctly

---

## ✅ Frontend Code is Correct

The frontend already uses:
```javascript
const DECISION_ENGINE_URL = isProduction ? '/api/decision' : "http://localhost:7003";
```

So calls go to: `/api/decision/v1/intent/resume` ✅

---

## 🔍 Verify Nginx Configuration on EC2

**SSH into EC2:**

```bash
ssh -i intent-platform-key.pem ubuntu@44.202.189.78

# Check current Nginx config
sudo cat /etc/nginx/sites-available/intent-platform
```

**Should have:**

```nginx
location /api/decision {
    proxy_pass http://127.0.0.1:7003;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

**If missing or incorrect, update it:**

```bash
sudo nano /etc/nginx/sites-available/intent-platform
```

**Add/update the decision engine location block:**

```nginx
location /api/decision {
    proxy_pass http://127.0.0.1:7003;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

**Test and reload:**

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🧪 Test Routing

### Test 1: Direct Engine Access

```bash
# On EC2 - test decision engine directly
curl http://127.0.0.1:7003/v1/intent/resume?userId=test&tenantId=intent-platform
```

**Expected:** JSON response (even if empty) or 200 OK

### Test 2: Via Nginx

```bash
# On EC2 - test via Nginx
curl http://localhost/api/decision/v1/intent/resume?userId=test&tenantId=intent-platform
```

**Expected:** Same response as Test 1

### Test 3: From Browser

Open DevTools → Network tab:
- Should see: `GET /api/decision/v1/intent/resume` → **200 OK** (not 404)

---

## 🔧 Other Issues to Fix

### Issue 1: 500 Error on Intent Engine

**Error:** `"Cannot read properties of undefined (reading 'complianceStatus')"`

**Check logs:**
```bash
pm2 logs intent-engine --lines 50
```

**Likely cause:** Intent engine calling compliance engine before it's ready, or missing response data.

### Issue 2: 405 on Explainability Engine

**Error:** `POST /api/explainability/v1/execute → 405 Not Allowed`

**Check:**
1. **Verify route exists:**
   ```bash
   curl -X POST http://127.0.0.1:7006/v1/execute \
     -H "Content-Type: application/json" \
     -d '{"test": "data"}'
   ```

2. **Check Nginx config:**
   ```bash
   sudo cat /etc/nginx/sites-available/intent-platform | grep explainability
   ```

3. **Verify explainability engine is running:**
   ```bash
   pm2 status | grep explainability
   curl http://127.0.0.1:7006/v1/health
   ```

---

## 📋 Complete Nginx Config (Reference)

**Full config should look like:**

```nginx
server {
    listen 80;
    server_name _;

    root /home/ubuntu/app/frontend;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Intent Engine
    location /api/intent {
        proxy_pass http://127.0.0.1:7001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Compliance Engine
    location /api/compliance {
        proxy_pass http://127.0.0.1:7002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Decision Engine (CRITICAL - must be correct)
    location /api/decision {
        proxy_pass http://127.0.0.1:7003;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Action Engine
    location /api/action {
        proxy_pass http://127.0.0.1:7004;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Risk Engine
    location /api/risk {
        proxy_pass http://127.0.0.1:7005;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Explainability Engine
    location /api/explainability {
        proxy_pass http://127.0.0.1:7006;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Evidence Engine
    location /api/evidence {
        proxy_pass http://127.0.0.1:7007;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Email Service
    location /api/email {
        proxy_pass http://127.0.0.1:7008;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Video Service
    location /api/video {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket (Speech Service)
    location /ws/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

## ✅ Verification Checklist

After fixing Nginx:

- [ ] Nginx config has `/api/decision` location block
- [ ] `sudo nginx -t` passes
- [ ] `curl http://127.0.0.1:7003/v1/intent/resume` works
- [ ] `curl http://localhost/api/decision/v1/intent/resume` works
- [ ] Browser shows 200 OK (not 404) for resume call
- [ ] All other engine routes work

---

**The frontend is correct - just verify Nginx routing matches! 🔧**
