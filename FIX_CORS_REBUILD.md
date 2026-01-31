# 🔧 Fix CORS Error - Rebuild Frontend

**Problem:** Frontend is calling `http://localhost:7001` instead of `/api/intent`

**Solution:** Rebuild frontend with production mode to use relative paths

---

## ✅ What I Fixed

1. Updated `src/api/intentApi.js` to:
   - Detect production mode automatically
   - Use relative paths (`/api/...`) in production
   - Use `localhost` URLs only in development

2. No need to set individual engine URLs in `.env.production` - it auto-detects!

---

## 🚀 Rebuild Steps

### Step 1: Clean Previous Build

```bash
cd "/Users/bhanukiran/Downloads/ACENTLE/UiP/URIP/Updated Code/RealEstate Intent AI Platform/intent-frontend-full-working"

# Remove old build
rm -rf dist
```

### Step 2: Ensure .env.production Exists

```bash
# Create/verify .env.production
cat > .env.production << 'EOF'
VITE_EMAIL_SERVICE_URL=/api/email
VITE_LIVEKIT_TOKEN_URL=/api/video/token
VITE_LIVEKIT_URL=wss://qhire-ai-interivew-xygij6p0.livekit.cloud
VITE_SPEECH_SERVICE_URL=/ws/transcribe
VITE_USE_WHISPER_BACKEND=false
VITE_USE_UNIFIED_ENGINE=false
EOF
```

### Step 3: Build for Production

```bash
# Build with production mode (this is critical!)
npm run build -- --mode production
```

**OR** (if the above doesn't work):

```bash
# Set mode explicitly
NODE_ENV=production npm run build
```

### Step 4: Verify Build

```bash
# Check that dist files don't contain localhost:7001
grep -r "localhost:7001" dist/ && echo "❌ Still has localhost!" || echo "✅ No localhost found!"

# Check that dist files contain /api/ paths
grep -r "/api/intent" dist/ && echo "✅ Has /api/ paths!" || echo "⚠️ Check build"
```

### Step 5: Upload to EC2

```bash
# Upload new build
scp -i intent-platform-key.pem -r dist/* ubuntu@44.202.189.78:/home/ubuntu/app/frontend/
```

### Step 6: Clear Browser Cache

**Important:** Clear browser cache or do hard refresh:
- Chrome/Edge: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Or open in Incognito/Private mode

---

## 🔍 Verify Fix

After rebuilding and uploading:

1. Open browser: `http://44.202.189.78`
2. Open DevTools (F12) → Network tab
3. Try creating an intent
4. Check Network requests - should show:
   - ✅ `/api/intent/v1/execute` (relative path)
   - ❌ NOT `http://localhost:7001/v1/execute`

5. Check Console - should have NO CORS errors

---

## 📝 What Changed in Code

**Before:**
```javascript
const INTENT_ENGINE_URL = "http://localhost:7001"; // Always localhost
```

**After:**
```javascript
const isProduction = import.meta.env.MODE === 'production';
const INTENT_ENGINE_URL = isProduction 
  ? '/api/intent'  // Relative path in production
  : "http://localhost:7001"; // Localhost in development
```

---

## ✅ Expected Result

After rebuild:
- ✅ No CORS errors
- ✅ API calls go to `/api/...` (relative paths)
- ✅ Nginx proxies to backend engines
- ✅ Everything works end-to-end

---

**Rebuild now and the CORS errors will be gone! 🚀**
