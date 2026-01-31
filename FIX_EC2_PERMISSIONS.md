# Fix EC2 Permission Denied Error

## 🔴 Problem

```
scp: dest open "/home/ubuntu/app/frontend/assets/...": Permission denied
```

**Cause:** The `/home/ubuntu/app/frontend` directory doesn't exist or has wrong permissions.

---

## ✅ Solution

### Step 1: Create Directory on EC2

**SSH into your EC2 instance:**

```bash
ssh -i intent-platform-key.pem ubuntu@44.202.189.78
```

**Create directories with correct permissions:**

```bash
# Create app directory structure
mkdir -p /home/ubuntu/app/frontend
mkdir -p /home/ubuntu/app/email-service
mkdir -p /home/ubuntu/app/video-service

# Set ownership
sudo chown -R ubuntu:ubuntu /home/ubuntu/app

# Set permissions
chmod -R 755 /home/ubuntu/app
```

### Step 2: Upload Files Again

**From your local machine:**

```bash
# Upload frontend
scp -i intent-platform-key.pem -r dist/* ubuntu@44.202.189.78:/home/ubuntu/app/frontend/

# Upload services
scp -i intent-platform-key.pem -r email-service ubuntu@44.202.189.78:/home/ubuntu/app/
scp -i intent-platform-key.pem -r video-service ubuntu@44.202.189.78:/home/ubuntu/app/
```

---

## 🔄 Alternative: Use Sudo on EC2

If you still get permission errors:

**On EC2, create directory with sudo:**

```bash
sudo mkdir -p /home/ubuntu/app/frontend
sudo chown -R ubuntu:ubuntu /home/ubuntu/app
```

**Then upload again from local machine.**

---

## ✅ Verify

**On EC2:**

```bash
ls -la /home/ubuntu/app/frontend/
```

Should show your files with `ubuntu` ownership.
