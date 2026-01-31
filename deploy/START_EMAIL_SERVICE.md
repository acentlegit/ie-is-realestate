# 📧 Start Email Service on EC2

**Error:** `POST /api/email/v1/send 502 (Bad Gateway)`

**Cause:** Email service is not running on EC2.

---

## ✅ Quick Fix

**SSH into EC2:**

```bash
ssh -i intent-platform-key.pem ubuntu@44.202.189.78
```

**Start email service with PM2:**

```bash
cd /home/ubuntu/app/email-service

# Check if .env exists
ls -la .env

# If not, create it:
cat > .env << 'EOF'
PORT=7008
SENDGRID_API_KEY=SG.xwi5IVNTS12NaMiDsxABVg....
FROM_EMAIL=noreply@acentle.com
EOF

# Start with PM2
pm2 start server.js --name email-service --env production

# Save PM2 config
pm2 save
```

---

## 🔧 Verify Email Service

**Test locally on EC2:**

```bash
curl -X POST http://127.0.0.1:7008/v1/send \
  -H "Content-Type: application/json" \
  -d '{
    "template": "INTENT_CREATED",
    "to": "test@example.com",
    "data": {}
  }'
```

**Should return:** `{"success": true, ...}`

**Test via Nginx:**

```bash
curl -X POST http://localhost/api/email/v1/send \
  -H "Content-Type: application/json" \
  -d '{
    "template": "INTENT_CREATED",
    "to": "test@example.com",
    "data": {}
  }'
```

---

## 📋 Check PM2 Status

```bash
pm2 status
pm2 logs email-service --lines 20
```

**Should see:**
- ✅ `email-service` status: `online`
- ✅ Logs showing server started on port 7008

---

## 🔄 If Service Already Exists

**Restart it:**

```bash
pm2 restart email-service
pm2 logs email-service --lines 20
```

---

## ✅ After Fix

**In browser:**
- ✅ No more 502 errors on `/api/email/v1/send`
- ✅ Emails send successfully
- ✅ Email templates work

---

## 🎯 Complete PM2 Setup (If Needed)

**If PM2 ecosystem file exists:**

```bash
cd /home/ubuntu/app
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

**This will start all services including email-service.**
