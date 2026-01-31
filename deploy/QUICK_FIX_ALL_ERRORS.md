# 🚀 Quick Fix All Errors

**Current Issues:**
- ❌ 405 Not Allowed: Compliance, Explainability, Evidence engines
- ❌ 502 Bad Gateway: Email service
- ⚠️ Ollama errors: Expected (can ignore)

---

## ✅ Step 1: Run Diagnostics

**On EC2:**

```bash
# Upload diagnostic script
scp -i intent-platform-key.pem \
  deploy/diagnose-all-errors.sh \
  ubuntu@44.202.189.78:/home/ubuntu/

# SSH into EC2
ssh -i intent-platform-key.pem ubuntu@44.202.189.78

# Run diagnostics
chmod +x diagnose-all-errors.sh
./diagnose-all-errors.sh
```

**This will show you exactly what's wrong.**

---

## ✅ Step 2: Fix Based on Results

### If Engines Not Running:

```bash
cd /home/ubuntu/app/backend
pm2 restart all
pm2 save
```

### If 405 Errors (Routes Not Registered):

**The routes ARE defined in code, so this means engines need rebuild:**

```bash
cd /home/ubuntu/app/backend

# Rebuild engines
npm run build --workspaces --if-present

# Restart
pm2 restart all
```

### If Email Service Missing (502):

```bash
cd /home/ubuntu/app/email-service

# Install if needed
npm install --production

# Create .env
cat > .env << EOF
PORT=7008
SENDGRID_API_KEY=your_key_here
FROM_EMAIL=noreply@acentle.com
EOF

# Start with PM2
pm2 start server.js --name email-service --env PORT=7008
pm2 save
```

---

## ✅ Step 3: Verify Fixes

```bash
# Test all engines
curl -X POST http://127.0.0.1:7002/v1/execute \
  -H "Content-Type: application/json" \
  -d '{"intent":{"type":"BUY_PROPERTY"}}'

curl -X POST http://127.0.0.1:7006/v1/execute \
  -H "Content-Type: application/json" \
  -d '{"intent":{"type":"BUY_PROPERTY"}}'

curl -X POST http://127.0.0.1:7007/v1/execute \
  -H "Content-Type: application/json" \
  -d '{"intentId":"test"}'

# Test email service
curl http://127.0.0.1:7008/health
```

**All should return 200 OK or JSON responses (not 405, not 502)**

---

## ✅ Step 4: Reload Nginx

```bash
sudo systemctl reload nginx
```

---

## ✅ Step 5: Test in Browser

**Open:** `http://44.202.189.78`

**In DevTools → Network:**
- ✅ `/api/compliance/v1/execute` → 200 OK
- ✅ `/api/explainability/v1/execute` → 200 OK
- ✅ `/api/evidence/v1/execute` → 200 OK
- ✅ `/api/email/v1/send` → 200 OK
- ⚠️ Ollama errors → Can ignore

---

## 🎯 Expected Final State

| Endpoint | Status |
|----------|--------|
| `/api/intent/v1/execute` | ✅ 200 OK |
| `/api/compliance/v1/execute` | ✅ 200 OK |
| `/api/decision/v1/execute` | ✅ 200 OK |
| `/api/explainability/v1/execute` | ✅ 200 OK |
| `/api/evidence/v1/execute` | ✅ 200 OK |
| `/api/email/v1/send` | ✅ 200 OK |
| Ollama | ⚠️ Expected to fail (OK) |

---

**Run diagnostics first, then fix based on results! 🔧**
