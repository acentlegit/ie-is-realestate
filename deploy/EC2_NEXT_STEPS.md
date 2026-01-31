# ✅ Frontend Uploaded - Next Steps on EC2

**Your frontend files are now on EC2!** Follow these steps to complete the deployment.

---

## 🔧 Step 1: Verify Files on EC2

**SSH into your EC2 instance:**

```bash
ssh -i intent-platform-key.pem ubuntu@44.202.189.78
```

**Check that files are there:**

```bash
ls -la /home/ubuntu/app/frontend/
```

You should see:
- `index.html`
- `assets/` directory with JS and CSS files

---

## 🔧 Step 2: Set Correct Permissions

```bash
# Make sure ubuntu user owns the files
sudo chown -R ubuntu:ubuntu /home/ubuntu/app/frontend

# Set correct permissions
chmod -R 755 /home/ubuntu/app/frontend
```

---

## 🔧 Step 3: Verify Nginx Configuration

**Check if Nginx is configured:**

```bash
# Check if config file exists
ls -la /etc/nginx/sites-available/intent-platform

# If it doesn't exist, create it (see below)
```

**If Nginx config doesn't exist, create it:**

```bash
sudo nano /etc/nginx/sites-available/intent-platform
```

**Paste this configuration:**

```nginx
server {
    listen 80;
    server_name _;

    root /home/ubuntu/app/frontend;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/intent { proxy_pass http://127.0.0.1:7001; }
    location /api/compliance { proxy_pass http://127.0.0.1:7002; }
    location /api/decision { proxy_pass http://127.0.0.1:7003; }
    location /api/action { proxy_pass http://127.0.0.1:7004; }
    location /api/risk { proxy_pass http://127.0.0.1:7005; }
    location /api/explainability { proxy_pass http://127.0.0.1:7006; }
    location /api/evidence { proxy_pass http://127.0.0.1:7007; }

    location /api/email { proxy_pass http://127.0.0.1:7008; }
    location /api/video { proxy_pass http://127.0.0.1:3002; }

    location /ws/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

**Enable the site:**

```bash
# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Enable your site
sudo ln -s /etc/nginx/sites-available/intent-platform /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

## 🔧 Step 4: Verify Backend Engines Are Running

**Check PM2 status:**

```bash
pm2 status
```

**If engines are not running, start them:**

```bash
cd /home/ubuntu/app/backend

# Start all engines
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot (if not done)
pm2 startup
# Follow the command it outputs
```

**Verify engines are bound to localhost:**

```bash
sudo netstat -tlnp | grep -E ':(7001|7002|7003|7004|7005|7006|7007)'
```

**Should show `127.0.0.1:PORT`, NOT `0.0.0.0:PORT`**

---

## ✅ Step 5: Test Your Deployment

### Test from EC2 (localhost):

```bash
# Test frontend
curl http://localhost/

# Test backend engines
curl http://localhost:7001/v1/health
curl http://localhost/api/intent/v1/health
```

### Test from Browser:

1. Open: `http://44.202.189.78` (or your EC2 IP)
2. Check browser console (F12) - should have NO CORS errors
3. Check Network tab - API calls should go to `/api/...`
4. Try creating an intent - should work!

---

## 🚨 Troubleshooting

### Frontend Not Loading

```bash
# Check Nginx error log
sudo tail -f /var/log/nginx/error.log

# Check if index.html exists
ls -la /home/ubuntu/app/frontend/index.html

# Check Nginx status
sudo systemctl status nginx
```

### CORS Errors in Browser

- Make sure frontend was built with `.env.production` (relative paths)
- Check browser console for exact error
- Verify Nginx is proxying `/api/...` correctly

### Engines Not Responding

```bash
# Check PM2 logs
pm2 logs

# Check if engines are running
pm2 status

# Restart engines
pm2 restart all
```

---

## 🎯 Quick Checklist

- [ ] Files uploaded to `/home/ubuntu/app/frontend/`
- [ ] Permissions set correctly
- [ ] Nginx configured and running
- [ ] Backend engines running (PM2)
- [ ] Engines bound to `127.0.0.1` (not `0.0.0.0`)
- [ ] Frontend loads in browser
- [ ] No CORS errors in browser console
- [ ] API calls work via `/api/...` paths

---

**Your frontend is deployed! Complete the steps above to make it live. 🚀**
