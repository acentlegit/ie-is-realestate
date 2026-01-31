# 🚀 Quick Deploy Guide

**Common mistake:** Using `EC2_IP` literally instead of your actual IP address!

---

## ✅ Correct Usage

### Step 1: Get Your EC2 IP

From AWS Console → EC2 → Your Instance → Copy the **Public IPv4 address**

Example: `44.202.189.78`

### Step 2: Use the Deployment Scripts

```bash
cd "/Users/bhanukiran/Downloads/ACENTLE/UiP/URIP/Updated Code/RealEstate Intent AI Platform/intent-frontend-full-working"

# Make scripts executable (first time only)
chmod +x deploy/*.sh

# Upload frontend (replace with YOUR actual EC2 IP)
./deploy/upload-frontend.sh 44.202.189.78

# Upload backend (replace with YOUR actual EC2 IP)
./deploy/upload-backend.sh 44.202.189.78

# Upload services (replace with YOUR actual EC2 IP)
./deploy/upload-services.sh 44.202.189.78
```

---

## ❌ Common Errors

### Error 1: "Could not resolve hostname ec2_ip"

**Wrong:**
```bash
scp -i key.pem file ubuntu@EC2_IP:/path/
```

**Correct:**
```bash
scp -i key.pem file ubuntu@44.202.189.78:/path/
```

### Error 2: "Permission denied (publickey)"

**Solution:**
```bash
# Make sure key file has correct permissions
chmod 400 intent-platform-key.pem

# Use full path to key file
scp -i /full/path/to/intent-platform-key.pem ...
```

### Error 3: "Connection timed out"

**Check:**
1. EC2 instance is running
2. Security group allows SSH (port 22) from your IP
3. You're using the correct public IP (not private IP)

---

## 📝 Manual Commands (If Scripts Don't Work)

### Upload Frontend

```bash
# Replace 44.202.189.78 with YOUR EC2 IP
# Replace intent-platform-key.pem with YOUR key file

cd "/Users/bhanukiran/Downloads/ACENTLE/UiP/URIP/Updated Code/RealEstate Intent AI Platform/intent-frontend-full-working"

# Build
npm run build

# Upload
scp -i intent-platform-key.pem -r dist/* ubuntu@44.202.189.78:/home/ubuntu/app/frontend/
```

### Upload Backend

```bash
# Replace 44.202.189.78 with YOUR EC2 IP

cd /Users/bhanukiran/Downloads/ACENTLE/UiP/uip-main

# Create package
tar --exclude='node_modules' --exclude='.git' --exclude='logs' -czf /tmp/backend.tar.gz .

# Upload
scp -i intent-platform-key.pem /tmp/backend.tar.gz ubuntu@44.202.189.78:/home/ubuntu/

# Cleanup
rm /tmp/backend.tar.gz
```

---

## 🔍 Verify Connection

Before uploading, test SSH connection:

```bash
# Replace with YOUR values
ssh -i intent-platform-key.pem ubuntu@44.202.189.78
```

If this works, SCP will work too.

---

## 💡 Pro Tip: Set Environment Variable

```bash
# Set once per terminal session
export EC2_IP=44.202.189.78
export EC2_KEY=intent-platform-key.pem

# Then use in commands
scp -i $EC2_KEY file ubuntu@$EC2_IP:/path/
```

---

**Remember: Always replace `EC2_IP` and `YOUR_EC2_IP` with your actual IP address!**
