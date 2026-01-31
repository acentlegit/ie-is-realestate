# 🚀 Upload and Start Backend Engines - Final Steps

**Status:** Frontend ✅ | CORS ✅ | Nginx ✅ | **Backend Engines ❌**

---

## 📍 Backend Location

Your backend engines are located at:
```
/Users/bhanukiran/Downloads/ACENTLE/UiP/uip-main
```

---

## ✅ STEP 1: Upload Backend to EC2

**From your Mac:**

```bash
cd /Users/bhanukiran/Downloads/ACENTLE/UiP/uip-main

# Create deployment package (exclude node_modules, .git, logs, dist)
tar --exclude='node_modules' \
    --exclude='.git' \
    --exclude='logs' \
    --exclude='dist' \
    --exclude='*.log' \
    -czf /tmp/backend.tar.gz .

# Upload to EC2
scp -i intent-platform-key.pem /tmp/backend.tar.gz ubuntu@44.202.189.78:/home/ubuntu/

# Cleanup
rm /tmp/backend.tar.gz

echo "✅ Backend uploaded to EC2"
```

---

## ✅ STEP 2: Extract and Setup on EC2

**SSH into EC2:**

```bash
ssh -i intent-platform-key.pem ubuntu@44.202.189.78
```

**On EC2, extract backend:**

```bash
# Create backend directory
mkdir -p /home/ubuntu/app/backend
cd /home/ubuntu/app/backend

# Extract backend code
tar -xzf /home/ubuntu/backend.tar.gz

# Remove archive
rm /home/ubuntu/backend.tar.gz

# Verify structure
ls -la services/ | head -10
# Should show: intent-engine, compliance-engine, decision-engine, etc.
```

---

## ✅ STEP 3: Install Dependencies and Build

**On EC2:**

```bash
cd /home/ubuntu/app/backend

# Install dependencies
npm install

# Build shared packages first
npm run build --workspace=@uip/core

# Build all engines
npm run build --workspaces --if-present

# Verify builds
ls services/intent-engine/dist/index.js
ls services/decision-engine/dist/index.js
ls services/explainability-engine/dist/index.js
```

---

## ✅ STEP 4: Create PM2 Ecosystem Config

**On EC2, create `/home/ubuntu/app/backend/ecosystem.config.js`:**

```bash
cat > /home/ubuntu/app/backend/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: "intent-engine",
      script: "services/intent-engine/dist/index.js",
      env: { PORT: 7001, HOST: "127.0.0.1", NODE_ENV: "production" },
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "500M"
    },
    {
      name: "compliance-engine",
      script: "services/compliance-engine/dist/index.js",
      env: { PORT: 7002, HOST: "127.0.0.1", NODE_ENV: "production" },
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "500M"
    },
    {
      name: "decision-engine",
      script: "services/decision-engine/dist/index.js",
      env: { PORT: 7003, HOST: "127.0.0.1", NODE_ENV: "production" },
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "500M"
    },
    {
      name: "action-engine",
      script: "services/action-engine/dist/index.js",
      env: { PORT: 7004, HOST: "127.0.0.1", NODE_ENV: "production" },
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "500M"
    },
    {
      name: "risk-engine",
      script: "services/risk-engine/dist/index.js",
      env: { PORT: 7005, HOST: "127.0.0.1", NODE_ENV: "production" },
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "500M"
    },
    {
      name: "explainability-engine",
      script: "services/explainability-engine/dist/index.js",
      env: { PORT: 7006, HOST: "127.0.0.1", NODE_ENV: "production" },
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "500M"
    },
    {
      name: "evidence-engine",
      script: "services/evidence-engine/dist/index.js",
      env: { PORT: 7007, HOST: "127.0.0.1", NODE_ENV: "production" },
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "500M"
    }
  ]
};
EOF
```

---

## ✅ STEP 5: Start Engines with PM2

**On EC2:**

```bash
cd /home/ubuntu/app/backend

# Stop any existing PM2 processes
pm2 delete all 2>/dev/null || true

# Start all engines
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the command it outputs (usually: sudo env PATH=... pm2 startup systemd -u ubuntu --hp /home/ubuntu)

# Check status
pm2 status
```

**Expected output:**
```
┌─────┬──────────────────────┬─────────┬─────────┬──────────┐
│ id  │ name                 │ status  │ restart │ uptime   │
├─────┼──────────────────────┼─────────┼─────────┼──────────┤
│ 0   │ intent-engine        │ online  │ 0       │ 0s       │
│ 1   │ compliance-engine    │ online  │ 0       │ 0s       │
│ 2   │ decision-engine      │ online  │ 0       │ 0s       │
│ 3   │ action-engine        │ online  │ 0       │ 0s       │
│ 4   │ risk-engine          │ online  │ 0       │ 0s       │
│ 5   │ explainability-engine│ online  │ 0       │ 0s       │
│ 6   │ evidence-engine      │ online  │ 0       │ 0s       │
└─────┴──────────────────────┴─────────┴─────────┴──────────┘
```

---

## ✅ STEP 6: Verify Engines Are Running

**On EC2:**

```bash
# Wait 2 seconds for engines to start
sleep 2

# Check if engines are listening on localhost
sudo netstat -tlnp | grep -E ':(7001|7002|7003|7004|7005|7006|7007)'
```

**Expected output:**
```
tcp  0  0  127.0.0.1:7001  *:*  LISTEN  [node]
tcp  0  0  127.0.0.1:7002  *:*  LISTEN  [node]
tcp  0  0  127.0.0.1:7003  *:*  LISTEN  [node]
tcp  0  0  127.0.0.1:7004  *:*  LISTEN  [node]
tcp  0  0  127.0.0.1:7005  *:*  LISTEN  [node]
tcp  0  0  127.0.0.1:7006  *:*  LISTEN  [node]
tcp  0  0  127.0.0.1:7007  *:*  LISTEN  [node]
```

**Test health endpoints:**

```bash
# Test direct engine access (should work)
curl http://127.0.0.1:7001/v1/health
curl http://127.0.0.1:7003/v1/health
curl http://127.0.0.1:7006/v1/health

# Test via Nginx (should work)
curl http://localhost/api/intent/v1/health
curl http://localhost/api/decision/v1/health
curl http://localhost/api/explainability/v1/health
```

**Expected response:**
```json
{"status":"ok"}
```

---

## ✅ STEP 7: Reload Nginx

**On EC2:**

```bash
sudo systemctl reload nginx

# Verify Nginx is running
sudo systemctl status nginx
```

---

## ✅ STEP 8: Test in Browser

**Open browser:** `http://44.202.189.78`

**In DevTools → Network tab:**
- ✅ `/api/intent/v1/execute` → **200 OK** (not 502)
- ✅ `/api/decision/v1/...` → **200 OK** (not 502)
- ✅ `/api/explainability/v1/execute` → **200 OK** (not 405)
- ❌ No `localhost:7001` in requests
- ❌ No CORS errors

**In DevTools → Console:**
- ✅ No 502 Bad Gateway errors
- ✅ No CORS errors
- ⚠️ Ollama errors are expected (can ignore)

---

## 🎯 Final Checklist

- [ ] Backend code uploaded to EC2
- [ ] Engines built successfully
- [ ] PM2 ecosystem.config.js created
- [ ] All engines started with PM2
- [ ] Engines listening on `127.0.0.1:7001-7007`
- [ ] Health endpoints return `{"status":"ok"}`
- [ ] Nginx reloaded
- [ ] Browser shows 200 OK (not 502)
- [ ] No CORS errors
- [ ] Intent creation works end-to-end

---

## 🚨 Troubleshooting

### PM2 Shows "errored"

```bash
# Check logs
pm2 logs intent-engine --lines 50

# Common issues:
# - Missing dependencies: npm install
# - Build failed: npm run build --workspaces
# - Port already in use: pm2 delete all, then restart
```

### Engines Not Binding to 127.0.0.1

**Verify engine code uses:**
```javascript
app.listen({ port, host: "127.0.0.1" })
```

**Check with:**
```bash
sudo netstat -tlnp | grep 7001
# Should show 127.0.0.1:7001, NOT 0.0.0.0:7001
```

### Still Getting 502 After Starting Engines

```bash
# Check Nginx error log
sudo tail -20 /var/log/nginx/error.log

# Check if engines are actually running
pm2 status

# Test direct connection
curl http://127.0.0.1:7001/v1/health
```

---

## 🎉 Success Criteria

Once complete, you should see:

1. **PM2 Status:** All 7 engines "online"
2. **Network:** Engines on `127.0.0.1:7001-7007`
3. **Health:** All endpoints return `{"status":"ok"}`
4. **Browser:** 200 OK responses, no 502 errors
5. **Functionality:** Intent creation works end-to-end

---

**Follow these steps exactly and your platform will be fully operational! 🚀**
