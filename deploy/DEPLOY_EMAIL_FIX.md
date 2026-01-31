# 🚀 Deploy Email Service Fix

**Issue:** Email service returns 500 errors because SendGrid rejects invalid email "dev" (from mock Keycloak).

**Fix:** Email service now validates emails and gracefully skips invalid ones (returns 200 OK with `skipped: true`).

---

## 📤 Step 1: Upload Email Service Fix

**On your local machine:**

```bash
cd "/Users/bhanukiran/Downloads/ACENTLE/UiP/URIP/Updated Code/RealEstate Intent AI Platform/intent-frontend-full-working"

# Upload email service
scp -i intent-platform-key.pem email-service/server.js ubuntu@44.202.189.78:/home/ubuntu/app/email-service/
```

---

## 🔧 Step 2: Restart Email Service on EC2

**SSH into EC2:**

```bash
ssh -i intent-platform-key.pem ubuntu@44.202.189.78

# Restart email service
pm2 restart email-service

# Check logs
pm2 logs email-service --lines 20
```

**Expected output:**
```
📧 Email Service running on port 7008
📧 SendGrid configured with FROM: noreply@acentle.com
📧 DOCX generation: enabled
```

---

## ✅ Step 3: Test Email Service

**On EC2, test with invalid email (should skip gracefully):**

```bash
curl -X POST http://127.0.0.1:7008/v1/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "dev",
    "template": "INTENT_CREATED",
    "data": {"intentId": "test"}
  }'
```

**Expected response (200 OK):**
```json
{
  "success": false,
  "skipped": true,
  "reason": "Invalid email address",
  "invalidEmails": ["dev"],
  "message": "Email skipped: invalid recipient(s) - dev"
}
```

**Test with valid email (should send):**

```bash
curl -X POST http://127.0.0.1:7008/v1/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "bsai@acentle.com",
    "template": "INTENT_CREATED",
    "data": {"intentId": "test"}
  }'
```

**Expected response (200 OK):**
```json
{
  "success": true,
  "statusCode": 202,
  "messageId": "...",
  "template": "INTENT_CREATED"
}
```

---

## 📤 Step 4: Deploy Frontend (Optional)

**If you want to deploy the frontend fix too:**

```bash
# On local machine
cd "/Users/bhanukiran/Downloads/ACENTLE/UiP/URIP/Updated Code/RealEstate Intent AI Platform/intent-frontend-full-working"
tar -czf dist.tar.gz dist/
scp -i intent-platform-key.pem dist.tar.gz ubuntu@44.202.189.78:/home/ubuntu/

# On EC2
cd /home/ubuntu/app/frontend
tar -xzf ~/dist.tar.gz --strip-components=1
sudo systemctl reload nginx
```

---

## ✅ Expected Results

**Before fix:**
- ❌ `POST /api/email/v1/send 500 (Internal Server Error)`
- ❌ SendGrid error: "Does not contain a valid address"
- ❌ Email service logs show errors

**After fix:**
- ✅ `POST /api/email/v1/send 200 OK` (even for invalid emails)
- ✅ Invalid emails are skipped gracefully (no SendGrid errors)
- ✅ Valid emails send successfully
- ✅ Frontend logs: "Email skipped (invalid recipient)" instead of errors

---

## 🎯 Summary

**What changed:**
1. Email service validates email addresses before sending to SendGrid
2. Invalid emails return 200 OK with `skipped: true` (not 500 error)
3. Frontend handles skipped emails gracefully (no error logs)
4. Valid emails still send successfully

**Why this works:**
- Mock Keycloak returns "dev" as email (invalid)
- Email service now catches this before SendGrid
- Returns success response (non-blocking)
- Frontend treats skipped emails as non-errors

---

## 🔍 Verify Fix

**Check PM2 logs:**

```bash
pm2 logs email-service --lines 30
```

**Should see:**
- ✅ `⚠️ Skipping email send - invalid email addresses: dev` (for invalid emails)
- ✅ `✅ Email sent: INTENT_CREATED to bsai@acentle.com` (for valid emails)
- ❌ No more SendGrid 400 errors

**Check browser console:**
- ✅ `[Email Service] Email skipped (invalid recipient): INTENT_CREATED - 1 recipient(s) skipped`
- ❌ No more 500 errors
