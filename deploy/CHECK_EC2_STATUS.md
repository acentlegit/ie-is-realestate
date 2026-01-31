# 🔍 Check EC2 Status Before Deploying

**Error:** `ssh: connect to host 44.202.189.78 port 22: Operation timed out`

This means EC2 is not reachable. Check these:

---

## ✅ Step 1: Check EC2 Instance Status

**AWS Console → EC2 → Instances**

**Status should be:**
- ✅ **Running** = Good, proceed
- ⚠️ **Stopped** = Start it first
- ❌ **Terminated** = Need new instance

---

## ✅ Step 2: Check Security Group

**AWS Console → EC2 → Security Groups**

**Find your instance's security group and verify:**

| Type | Protocol | Port | Source |
|------|----------|------|--------|
| SSH | TCP | 22 | **Your IP** or `0.0.0.0/0` |

**If missing:**
1. Edit Inbound Rules
2. Add: SSH, Port 22, Source: Your IP (or `0.0.0.0/0` for testing)
3. Save

---

## ✅ Step 3: Check IP Address

**EC2 instances get new IPs when:**
- Stopped and restarted (if not using Elastic IP)
- Terminated and recreated

**Check current IP:**
1. AWS Console → EC2 → Instances
2. Select your instance
3. Check **Public IPv4 address**
4. Update commands with new IP if changed

---

## ✅ Step 4: Test Connection

**From your terminal:**

```bash
# Test ping (may fail - ICMP often disabled)
ping -c 2 44.202.189.78

# Test SSH
ssh -i intent-platform-key.pem -o ConnectTimeout=5 ubuntu@44.202.189.78 "echo 'SSH works!'"
```

**If SSH fails:**
- Instance is stopped → Start it
- Security group blocking → Add SSH rule
- IP changed → Use new IP

---

## 🚀 Once Connection Works

**Then deploy:**

```bash
cd "/Users/bhanukiran/Downloads/ACENTLE/UiP/URIP/Updated Code/RealEstate Intent AI Platform/intent-frontend-full-working"
./deploy/DEPLOY_EVERYTHING_FIXED.sh 44.202.189.78
```

---

## 🔧 Quick Fixes

### Fix 1: Start Instance
```bash
# In AWS Console
EC2 → Instances → Select → Instance State → Start
# Wait 1-2 minutes, then try SSH again
```

### Fix 2: Add SSH Rule
```bash
# In AWS Console
EC2 → Security Groups → Select your SG → Inbound Rules → Edit
# Add: SSH, Port 22, Source: 0.0.0.0/0 (or your IP)
```

### Fix 3: Get New IP
```bash
# In AWS Console
EC2 → Instances → Check Public IPv4
# Update all commands with new IP
```

---

## 📋 Most Likely Issue

**Based on timeout error:**
1. **Instance stopped** (most common)
   - **Fix:** Start instance in AWS Console

2. **Security group blocking SSH**
   - **Fix:** Add SSH rule to security group

3. **IP address changed**
   - **Fix:** Check new IP in AWS Console

---

## ✅ After Fixing

**Test connection:**
```bash
ssh -i intent-platform-key.pem ubuntu@44.202.189.78 "echo 'SSH works!'"
```

**If successful, deploy:**
```bash
./deploy/DEPLOY_EVERYTHING_FIXED.sh 44.202.189.78
```
