# ✅ Quick Fix: Use Full Path to Key File

**The key file exists, but the script needs the full path.**

---

## 🚀 Quick Solution

**Run from the project root directory:**

```bash
cd "/Users/bhanukiran/Downloads/ACENTLE/UiP/URIP/Updated Code/RealEstate Intent AI Platform/intent-frontend-full-working"

# Use full path to key file
./deploy/upload-backend.sh 44.202.189.78 "$(pwd)/intent-platform-key.pem"
```

**OR** use the absolute path directly:

```bash
./deploy/upload-backend.sh 44.202.189.78 "/Users/bhanukiran/Downloads/ACENTLE/UiP/URIP/Updated Code/RealEstate Intent AI Platform/intent-frontend-full-working/intent-platform-key.pem"
```

---

## ✅ Alternative: Manual Upload

If the script still has issues, upload manually:

```bash
cd /Users/bhanukiran/Downloads/ACENTLE/UiP/uip-main

# Create package
tar --exclude='node_modules' --exclude='.git' --exclude='logs' --exclude='dist' -czf /tmp/backend.tar.gz .

# Upload with full key path
scp -i "/Users/bhanukiran/Downloads/ACENTLE/UiP/URIP/Updated Code/RealEstate Intent AI Platform/intent-frontend-full-working/intent-platform-key.pem" \
    /tmp/backend.tar.gz ubuntu@44.202.189.78:/home/ubuntu/

# Cleanup
rm /tmp/backend.tar.gz
```

---

**The key file is at:**
`/Users/bhanukiran/Downloads/ACENTLE/UiP/URIP/Updated Code/RealEstate Intent AI Platform/intent-frontend-full-working/intent-platform-key.pem`

**Use the full path and it will work! ✅**
