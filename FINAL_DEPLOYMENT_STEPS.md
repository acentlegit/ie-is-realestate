# ✅ Final Deployment Steps

**All critical fixes are complete. Follow these steps exactly.**

---

## 1️⃣ Fix Engine Bindings (DONE ✅)

All 6 engines have been updated to bind to `127.0.0.1`:
- ✅ intent-engine
- ✅ compliance-engine
- ✅ decision-engine
- ✅ action-engine
- ✅ risk-engine
- ✅ explainability-engine
- ✅ evidence-engine (already correct)

**Next:** Rebuild engines on backend

```bash
cd /Users/bhanukiran/Downloads/ACENTLE/UiP/uip-main
npm run build --workspaces --if-present
```

---

## 2️⃣ Rebuild Frontend with Correct Environment

**Create `.env.production` in frontend directory:**

```bash
cd "/Users/bhanukiran/Downloads/ACENTLE/UiP/URIP/Updated Code/RealEstate Intent AI Platform/intent-frontend-full-working"

cat > .env.production << 'EOF'
VITE_EMAIL_SERVICE_URL=/api/email
VITE_LIVEKIT_TOKEN_URL=/api/video/token
VITE_LIVEKIT_URL=wss://qhire-ai-interivew-xygij6p0.livekit.cloud
VITE_SPEECH_SERVICE_URL=/ws/transcribe
VITE_USE_WHISPER_BACKEND=false
VITE_USE_UNIFIED_ENGINE=false
EOF
```

**Build frontend:**

```bash
npm run build
```

**Verify build output:**

```bash
# Check that dist/index.html doesn't contain localhost or IP addresses
grep -r "localhost\|127.0.0.1\|7001\|7002" dist/ || echo "✅ No hardcoded URLs found"
```

---

## 3️⃣ Deploy to EC2

### Upload Backend

```bash
cd /Users/bhanukiran/Downloads/ACENTLE/UiP/uip-main

# Create deployment package
tar --exclude='node_modules' \
    --exclude='.git' \
    --exclude='logs' \
    -czf /tmp/backend.tar.gz .

# Upload
scp -i intent-platform-key.pem /tmp/backend.tar.gz ubuntu@YOUR_EC2_IP:/home/ubuntu/
```

**On EC2:**

```bash
cd /home/ubuntu/app/backend
tar -xzf /home/ubuntu/backend.tar.gz
rm /home/ubuntu/backend.tar.gz
npm install
npm run build --workspace=@uip/core
npm run build --workspaces --if-present
```

### Upload Frontend

```bash
cd "/Users/bhanukiran/Downloads/ACENTLE/UiP/URIP/Updated Code/RealEstate Intent AI Platform/intent-frontend-full-working"

# Upload dist folder
scp -i intent-platform-key.pem -r dist/* ubuntu@YOUR_EC2_IP:/home/ubuntu/app/frontend/
```

---

## 4️⃣ Restart Everything Cleanly

**On EC2:**

```bash
# Stop all PM2 processes
pm2 delete all

# Start with ecosystem config
cd /home/ubuntu/app/backend
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup (if not done)
pm2 startup
# Follow the command it outputs

# Restart Nginx
sudo systemctl restart nginx

# Verify
pm2 status
sudo systemctl status nginx
```

---

## 5️⃣ Verify Deployment

### Check Engine Bindings

```bash
# On EC2 - should show 127.0.0.1, NOT 0.0.0.0
sudo netstat -tlnp | grep -E ':(7001|7002|7003|7004|7005|7006|7007)'
```

**Expected output:**
```
tcp  0  0  127.0.0.1:7001  *:*  LISTEN  [node]
tcp  0  0  127.0.0.1:7002  *:*  LISTEN  [node]
...
```

### Test Endpoints

```bash
# From EC2 (should work)
curl http://127.0.0.1:7001/v1/health

# From external (should work via Nginx)
curl http://YOUR_EC2_IP/api/intent/v1/health

# Direct engine access (should FAIL - this is correct!)
curl http://YOUR_EC2_IP:7001/v1/health
# Should timeout or connection refused
```

### Test Frontend

1. Open browser: `http://YOUR_EC2_IP`
2. Check browser console (F12) - should have NO CORS errors
3. Check Network tab - all API calls should go to `/api/...`
4. Test creating an intent - should work end-to-end

---

## ✅ Final Checklist

- [ ] All engines bind to `127.0.0.1` (verified with netstat)
- [ ] Frontend built with `.env.production` (relative paths only)
- [ ] PM2 running all engines
- [ ] Nginx configured and running
- [ ] Security group: Only ports 22, 80, 443 open
- [ ] Direct engine access fails from outside (correct!)
- [ ] Frontend loads without errors
- [ ] API calls work via Nginx proxy
- [ ] No CORS errors in browser console

---

## 🎯 What's Fixed

✅ **Security**: Engines only accessible via Nginx  
✅ **CORS**: Frontend uses relative paths  
✅ **Architecture**: Single entry point (Nginx)  
✅ **Binding**: All engines on localhost only  
✅ **Configuration**: Production-ready environment variables  

---

**Your platform is now secure and ready for production! 🚀**
