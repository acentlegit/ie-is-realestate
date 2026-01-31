# 🔧 Fix Email 500 Errors

**Error:** `POST /api/email/v1/send 500 (Internal Server Error)`

**Cause:** Email service is running but has an internal error (likely SendGrid configuration issue).

---

## 🔍 Diagnose the Issue

**SSH into EC2:**

```bash
ssh -i intent-platform-key.pem ubuntu@44.202.189.78

# Check email service logs
pm2 logs email-service --lines 50
```

**Look for:**
- ❌ `Missing SENDGRID_API_KEY`
- ❌ `Missing FROM_EMAIL`
- ❌ `SendGrid error details`
- ❌ Invalid email address (e.g., "dev" instead of real email)

---

## ✅ Fix 1: Check Email Service Configuration

**On EC2:**

```bash
cd /home/ubuntu/app/email-service

# Check .env file
cat .env
```

**Should have:**
```env
PORT=7008
SENDGRID_API_KEY=SG.xwi5IVNTS12NaMiDsxABVg....
FROM_EMAIL=noreply@acentle.com
```

**If missing or wrong, fix it:**

```bash
cat > .env << 'EOF'
PORT=7008
SENDGRID_API_KEY=SG.xwi5IVNTS12NaMiDsxABVg....
FROM_EMAIL=noreply@acentle.com
EOF

# Restart service
pm2 restart email-service
pm2 logs email-service --lines 20
```

---

## ✅ Fix 2: Verify SendGrid Configuration

**The error might be:**
1. **Invalid API Key** - Check SendGrid dashboard
2. **FROM_EMAIL not verified** - Verify sender in SendGrid
3. **Invalid recipient** - Frontend sending to "dev" instead of real email

**Check SendGrid:**
- Go to SendGrid Dashboard
- Verify `noreply@acentle.com` is authenticated
- Check API key is active

---

## ✅ Fix 3: Test Email Service Directly

**On EC2:**

```bash
# Test with valid email
curl -X POST http://127.0.0.1:7008/v1/send \
  -H "Content-Type: application/json" \
  -d '{
    "template": "INTENT_CREATED",
    "to": "bsai@acentle.com",
    "data": {
      "intentId": "test",
      "intentType": "BUY_PROPERTY"
    }
  }'
```

**If this works:** The issue is frontend sending invalid email ("dev")

**If this fails:** Check SendGrid configuration

---

## ✅ Fix 4: Update Frontend to Use Real Email

**The frontend is sending emails to "dev" (from mock auth).**

**This is expected with mock Keycloak.** When real Keycloak is configured, it will use real emails.

**For now, you can:**
1. Accept that emails fail with mock auth (expected)
2. OR configure Keycloak with real user emails
3. OR add email override in frontend for testing

---

## 📋 Common SendGrid Errors

**Error: "The from address does not match a verified Sender Identity"**
- **Fix:** Verify `noreply@acentle.com` in SendGrid Dashboard

**Error: "Invalid API key"**
- **Fix:** Regenerate API key in SendGrid and update `.env`

**Error: "Invalid email address"**
- **Fix:** Frontend is sending "dev" - this is expected with mock auth

---

## ✅ After Fix

**Expected:**
- ✅ Email service logs show successful sends
- ✅ No 500 errors (or only for invalid emails like "dev")
- ✅ Real emails (bsai@acentle.com) send successfully

---

## 🎯 Quick Test

**On EC2, test email service:**

```bash
curl -X POST http://127.0.0.1:7008/v1/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "bsai@acentle.com",
    "template": "INTENT_CREATED",
    "data": {"intentId": "test"}
  }'
```

**Should return:** `{"success": true, ...}`

**If 500:** Check PM2 logs for SendGrid error details.
