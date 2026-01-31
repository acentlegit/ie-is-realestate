# 🔑 Find Your SSH Key File

**Problem:** SSH key file `intent-platform-key.pem` not found

---

## 🔍 How to Find Your Key File

### Option 1: Check Common Locations

```bash
# Check current directory
ls -la *.pem

# Check home directory
ls -la ~/*.pem

# Check Downloads
ls -la ~/Downloads/*.pem

# Check .ssh directory
ls -la ~/.ssh/*.pem
```

### Option 2: Search Your System

```bash
# Search for .pem files
find ~ -name "*.pem" -type f 2>/dev/null | grep -i "intent\|platform\|key"
```

### Option 3: Check AWS Console

1. Go to **EC2 Console** → **Key Pairs**
2. Find your key pair name
3. Download it if you don't have it locally
4. Save it as `intent-platform-key.pem`

---

## ✅ Once You Find the Key File

### Option A: Use Full Path

```bash
./deploy/upload-backend.sh 44.202.189.78 /full/path/to/intent-platform-key.pem
```

**Example:**
```bash
./deploy/upload-backend.sh 44.202.189.78 ~/Downloads/intent-platform-key.pem
```

### Option B: Copy to Current Directory

```bash
# Copy key to current directory
cp /path/to/your/key.pem intent-platform-key.pem

# Set correct permissions
chmod 400 intent-platform-key.pem

# Then run script
./deploy/upload-backend.sh 44.202.189.78
```

### Option C: Use Environment Variable

```bash
export EC2_KEY=/full/path/to/intent-platform-key.pem
./deploy/upload-backend.sh 44.202.189.78
```

---

## 🔒 Set Correct Permissions

**Important:** SSH keys must have restricted permissions:

```bash
chmod 400 intent-platform-key.pem
```

---

## 📝 Manual Upload (If Script Doesn't Work)

```bash
# Find your key file first
KEY_FILE="/path/to/intent-platform-key.pem"

# Navigate to backend directory
cd /Users/bhanukiran/Downloads/ACENTLE/UiP/uip-main

# Create package
tar --exclude='node_modules' --exclude='.git' --exclude='logs' --exclude='dist' -czf /tmp/backend.tar.gz .

# Upload with full key path
scp -i "$KEY_FILE" /tmp/backend.tar.gz ubuntu@44.202.189.78:/home/ubuntu/

# Cleanup
rm /tmp/backend.tar.gz
```

---

## ✅ Verify Key File Works

**Test SSH connection:**

```bash
ssh -i /path/to/intent-platform-key.pem ubuntu@44.202.189.78
```

If this works, SCP will work too.

---

**Once you find the key file, use the full path in the script! 🔑**
