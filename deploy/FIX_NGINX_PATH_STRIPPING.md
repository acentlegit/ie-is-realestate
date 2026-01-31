# 🔧 Fix 405 Errors - Nginx Path Stripping Issue

**Root Cause:** Nginx is NOT stripping the `/api/explainability` prefix, so backend receives wrong path.

---

## ❌ Current Problem

**Frontend calls:**
```
POST /api/explainability/v1/execute
```

**Nginx forwards to:**
```
POST http://127.0.0.1:7006/api/explainability/v1/execute  ❌ WRONG
```

**Backend expects:**
```
POST /v1/execute  ✅ CORRECT
```

**Result:** 405 because route `/api/explainability/v1/execute` doesn't exist (only `/v1/execute` exists)

---

## ✅ Solution: Fix Nginx Path Stripping

**The fix:** Add trailing slashes to `proxy_pass` to strip the location prefix.

---

## 🔧 Step 1: Update Nginx Config on EC2

**SSH into EC2:**

```bash
ssh -i intent-platform-key.pem ubuntu@44.202.189.78

# Edit Nginx config
sudo nano /etc/nginx/sites-available/intent-platform
```

**Replace these location blocks:**

```nginx
# ❌ WRONG (current)
location /api/compliance {
    proxy_pass http://127.0.0.1:7002;
}

location /api/explainability {
    proxy_pass http://127.0.0.1:7006;
}

location /api/evidence {
    proxy_pass http://127.0.0.1:7007;
}

location /api/email {
    proxy_pass http://127.0.0.1:7008;
}
```

**With these (CORRECT):**

```nginx
# ✅ CORRECT (add trailing slash to strip prefix)
location /api/compliance/ {
    proxy_pass http://127.0.0.1:7002/;
}

location /api/explainability/ {
    proxy_pass http://127.0.0.1:7006/;
}

location /api/evidence/ {
    proxy_pass http://127.0.0.1:7007/;
}

location /api/email/ {
    proxy_pass http://127.0.0.1:7008/;
}
```

**Also update other engines for consistency:**

```nginx
location /api/intent/ {
    proxy_pass http://127.0.0.1:7001/;
}

location /api/decision/ {
    proxy_pass http://127.0.0.1:7003/;
}

location /api/action/ {
    proxy_pass http://127.0.0.1:7004/;
}

location /api/risk/ {
    proxy_pass http://127.0.0.1:7005/;
}
```

**But wait!** The frontend calls `/api/explainability/v1/execute` (no trailing slash after `explainability`).

**So we need BOTH patterns:**

```nginx
# Match with or without trailing slash
location ~ ^/api/(compliance|explainability|evidence|email)(/.*)?$ {
    set $service $1;
    set $path $2;
    
    if ($service = compliance) {
        proxy_pass http://127.0.0.1:7002$path;
    }
    if ($service = explainability) {
        proxy_pass http://127.0.0.1:7006$path;
    }
    if ($service = evidence) {
        proxy_pass http://127.0.0.1:7007$path;
    }
    if ($service = email) {
        proxy_pass http://127.0.0.1:7008$path;
    }
}
```

**Actually, simpler approach - use rewrite:**

```nginx
# Compliance Engine
location /api/compliance {
    rewrite ^/api/compliance(.*)$ $1 break;
    proxy_pass http://127.0.0.1:7002;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

# Explainability Engine
location /api/explainability {
    rewrite ^/api/explainability(.*)$ $1 break;
    proxy_pass http://127.0.0.1:7006;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

# Evidence Engine
location /api/evidence {
    rewrite ^/api/evidence(.*)$ $1 break;
    proxy_pass http://127.0.0.1:7007;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

# Email Service
location /api/email {
    rewrite ^/api/email(.*)$ $1 break;
    proxy_pass http://127.0.0.1:7008;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

---

## 🔧 Step 2: Test & Reload Nginx

```bash
# Test config
sudo nginx -t

# If OK, reload
sudo systemctl reload nginx

# Test the route
curl -X POST http://localhost/api/explainability/v1/execute \
  -H "Content-Type: application/json" \
  -d '{"intentId":"test"}'
```

**Expected:** Should return 200 or JSON (not 405)

---

## 🧪 Step 3: Verify All Routes

**Run this test script on EC2:**

```bash
# Test all routes
echo "Testing routes..."

for service in compliance explainability evidence email; do
    echo -n "$service: "
    curl -s -X POST "http://localhost/api/$service/v1/execute" \
      -H "Content-Type: application/json" \
      -d '{"test":true}' \
      -w "HTTP: %{http_code}\n" | tail -1
done
```

**All should return 200 or 500 (not 405)**

---

## ✅ Complete Nginx Config (Reference)

```nginx
server {
    listen 80;
    server_name _;

    root /home/ubuntu/app/frontend;
    index index.html;

    # Frontend (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Intent Engine
    location /api/intent {
        rewrite ^/api/intent(.*)$ $1 break;
        proxy_pass http://127.0.0.1:7001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # Compliance Engine
    location /api/compliance {
        rewrite ^/api/compliance(.*)$ $1 break;
        proxy_pass http://127.0.0.1:7002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # Decision Engine
    location /api/decision {
        rewrite ^/api/decision(.*)$ $1 break;
        proxy_pass http://127.0.0.1:7003;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # Action Engine
    location /api/action {
        rewrite ^/api/action(.*)$ $1 break;
        proxy_pass http://127.0.0.1:7004;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # Risk Engine
    location /api/risk {
        rewrite ^/api/risk(.*)$ $1 break;
        proxy_pass http://127.0.0.1:7005;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # Explainability Engine
    location /api/explainability {
        rewrite ^/api/explainability(.*)$ $1 break;
        proxy_pass http://127.0.0.1:7006;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # Evidence Engine
    location /api/evidence {
        rewrite ^/api/evidence(.*)$ $1 break;
        proxy_pass http://127.0.0.1:7007;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # Email Service
    location /api/email {
        rewrite ^/api/email(.*)$ $1 break;
        proxy_pass http://127.0.0.1:7008;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # Video Service
    location /api/video {
        rewrite ^/api/video(.*)$ $1 break;
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # Speech Service (WebSocket)
    location /ws/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

---

## 🎯 Why This Fixes 405

**Before:**
- Request: `POST /api/explainability/v1/execute`
- Nginx forwards: `POST http://127.0.0.1:7006/api/explainability/v1/execute`
- Backend: Route `/api/explainability/v1/execute` doesn't exist → 405

**After:**
- Request: `POST /api/explainability/v1/execute`
- Nginx rewrites: `/v1/execute`
- Nginx forwards: `POST http://127.0.0.1:7006/v1/execute`
- Backend: Route `/v1/execute` exists → 200 ✅

---

## ✅ Final Checklist

- [ ] Update Nginx config with `rewrite` rules
- [ ] Test config: `sudo nginx -t`
- [ ] Reload Nginx: `sudo systemctl reload nginx`
- [ ] Test routes: `curl -X POST http://localhost/api/explainability/v1/execute ...`
- [ ] Verify browser: No more 405 errors

**This is the fix! The routes exist, methods are correct, just need to strip the path prefix. 🔧**
