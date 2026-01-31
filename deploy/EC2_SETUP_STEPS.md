# ✅ Backend Uploaded - Next Steps on EC2

**Status:** ✅ Backend uploaded to EC2 (210KB)

---

## 🚀 Quick Commands (Copy-Paste Ready)

### Step 1: SSH into EC2

```bash
ssh -i "/Users/bhanukiran/Downloads/ACENTLE/UiP/URIP/Updated Code/RealEstate Intent AI Platform/intent-frontend-full-working/intent-platform-key.pem" ubuntu@44.202.189.78
```

### Step 2: Extract Backend

```bash
mkdir -p /home/ubuntu/app/backend
cd /home/ubuntu/app/backend
tar -xzf /home/ubuntu/backend.tar.gz
rm /home/ubuntu/backend.tar.gz
```

### Step 3: Install Dependencies

```bash
cd /home/ubuntu/app/backend
npm install
```

### Step 4: Build Engines

```bash
# Build shared packages first
npm run build --workspace=@uip/core

# Build all engines
npm run build --workspaces --if-present
```

### Step 5: Create PM2 Config

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

### Step 6: Start Engines

```bash
cd /home/ubuntu/app/backend

# Stop any existing processes
pm2 delete all 2>/dev/null || true

# Start all engines
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the command it outputs (usually involves sudo)
```

### Step 7: Verify

```bash
# Check PM2 status
pm2 status

# Check engines are listening
sudo netstat -tlnp | grep -E ':(7001|7002|7003|7004|7005|7006|7007)'

# Test health endpoints
curl http://127.0.0.1:7001/v1/health
curl http://localhost/api/intent/v1/health
```

### Step 8: Reload Nginx

```bash
sudo systemctl reload nginx
```

---

## ✅ Expected Result

After completing these steps:

1. **PM2 Status:** All 7 engines show "online"
2. **Network:** Engines listening on `127.0.0.1:7001-7007`
3. **Health:** `curl http://localhost/api/intent/v1/health` returns `{"status":"ok"}`
4. **Browser:** `http://44.202.189.78` shows 200 OK (no 502 errors)

---

## 🎯 Quick Test

**In browser (after engines start):**
- Open: `http://44.202.189.78`
- Open DevTools → Network tab
- Try creating an intent
- Should see: `/api/intent/v1/execute` → **200 OK** ✅

---

**Follow these steps and your platform will be fully operational! 🚀**
