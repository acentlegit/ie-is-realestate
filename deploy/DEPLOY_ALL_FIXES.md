# 🚀 Deploy All Fixes - Email + Action Regeneration

**Fixes:**
1. ✅ Email 500 errors - Email service validates emails and skips invalid ones gracefully
2. ✅ Action regeneration - Prevents duplicate action fetches using intent ID + lifecycle state tracking

---

## 📤 Step 1: Deploy Email Service Fix

**On your local machine:**

```bash
cd "/Users/bhanukiran/Downloads/ACENTLE/UiP/URIP/Updated Code/RealEstate Intent AI Platform/intent-frontend-full-working"

# Upload email service fix
scp -i intent-platform-key.pem email-service/server.js ubuntu@44.202.189.78:/home/ubuntu/app/email-service/

# Restart email service
ssh -i intent-platform-key.pem ubuntu@44.202.189.78 "pm2 restart email-service && sleep 2 && pm2 logs email-service --lines 10 --nostream"
```

**Expected output:**
```
📧 Email Service running on port 7008
📧 SendGrid configured with FROM: noreply@acentle.com
```

---

## 📤 Step 2: Deploy Frontend Fix

**On your local machine:**

```bash
cd "/Users/bhanukiran/Downloads/ACENTLE/UiP/URIP/Updated Code/RealEstate Intent AI Platform/intent-frontend-full-working"

# Build frontend
npm run build

# Upload frontend
tar -czf dist.tar.gz dist/
scp -i intent-platform-key.pem dist.tar.gz ubuntu@44.202.189.78:/home/ubuntu/

# On EC2, extract and reload nginx
ssh -i intent-platform-key.pem ubuntu@44.202.189.78 << 'EOF'
  cd /home/ubuntu/app/frontend
  tar -xzf ~/dist.tar.gz --strip-components=1
  sudo systemctl reload nginx
  echo "✅ Frontend deployed"
EOF
```

---

## ✅ Step 3: Verify Fixes

### Test Email Service (Invalid Email)

**On EC2:**

```bash
curl -X POST http://127.0.0.1:7008/v1/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "dev",
    "template": "INTENT_CREATED",
    "data": {"intentId": "test"}
  }'
```

**Expected (200 OK):**
```json
{
  "success": false,
  "skipped": true,
  "reason": "Invalid email address",
  "invalidEmails": ["dev"]
}
```

### Test Email Service (Valid Email)

```bash
curl -X POST http://127.0.0.1:7008/v1/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "bsai@acentle.com",
    "template": "INTENT_CREATED",
    "data": {"intentId": "test"}
  }'
```

**Expected (200 OK):**
```json
{
  "success": true,
  "statusCode": 202,
  "template": "INTENT_CREATED"
}
```

### Test Frontend (Browser)

1. Open browser: `http://44.202.189.78`
2. Create an intent
3. Select decisions
4. **Check browser console:**

**Expected logs:**
- ✅ `[Decision Select] Skipping action fetch - already fetched for: <intentId>:DECISIONS_MADE`
- ✅ `[Email Service] Email skipped (invalid recipient): INTENT_CREATED - 1 recipient(s) skipped`
- ❌ NO `POST /api/email/v1/send 500` errors
- ❌ NO `Action not found` errors

---

## 🎯 What Changed

### Email Service (`email-service/server.js`)
- ✅ Added `isValidEmail()` function to validate email addresses
- ✅ Invalid emails return 200 OK with `skipped: true` (not 500 error)
- ✅ Prevents SendGrid 400 errors for invalid emails like "dev"

### Frontend (`src/screens/Intent.jsx`)
- ✅ Changed from `lastActionsLifecycleRef` + `actionsFetchedRef` to `actionsFetchedForRef` (Set)
- ✅ Tracks by `${intentId}:${lifecycleState}` to prevent duplicate fetches
- ✅ Sets fetch flag BEFORE calling `getActions()` to prevent race conditions
- ✅ Checks both `alreadyFetched` AND `hasActions` before fetching

---

## 🔍 Troubleshooting

### Email Still Returns 500

**Check PM2 logs:**
```bash
pm2 logs email-service --lines 50
```

**If you see SendGrid errors:**
- Check `.env` file has correct `SENDGRID_API_KEY` and `FROM_EMAIL`
- Verify `FROM_EMAIL` is verified in SendGrid dashboard

### Actions Still Regenerating

**Check browser console for:**
- `[Decision Select] Fetching actions` - should only appear once per lifecycle state
- `[Decision Select] Skipping action fetch - already fetched for:` - should appear on subsequent clicks

**If still regenerating:**
- Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)
- Check that frontend build was deployed correctly

---

## ✅ Success Criteria

**After deployment:**
- ✅ No `POST /api/email/v1/send 500` errors in browser console
- ✅ Email logs show: `⚠️ Skipping email send - invalid email addresses: dev`
- ✅ No `Action not found` errors when completing actions
- ✅ Actions fetched only once per lifecycle state
- ✅ Console shows: `[Decision Select] Skipping action fetch - already fetched for:`

---

## 🚀 Quick Deploy Script

**One-liner to deploy everything:**

```bash
cd "/Users/bhanukiran/Downloads/ACENTLE/UiP/URIP/Updated Code/RealEstate Intent AI Platform/intent-frontend-full-working" && \
scp -i intent-platform-key.pem email-service/server.js ubuntu@44.202.189.78:/home/ubuntu/app/email-service/ && \
ssh -i intent-platform-key.pem ubuntu@44.202.189.78 "pm2 restart email-service" && \
npm run build && \
tar -czf dist.tar.gz dist/ && \
scp -i intent-platform-key.pem dist.tar.gz ubuntu@44.202.189.78:/home/ubuntu/ && \
ssh -i intent-platform-key.pem ubuntu@44.202.189.78 "cd /home/ubuntu/app/frontend && tar -xzf ~/dist.tar.gz --strip-components=1 && sudo systemctl reload nginx && echo '✅ All fixes deployed!'"
```
