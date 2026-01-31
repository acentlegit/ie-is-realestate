# 🔧 Step-by-Step: Fix SSH Access

## Current Problem
SSH rule only allows: `112.133.220.136/32` (one specific IP)
Your current IP is different → Connection times out

---

## ✅ Fix: Update Security Group (2 minutes)

### Step 1: Open Security Group
1. Go to **AWS Console** → **EC2**
2. Click **Security Groups** (left sidebar)
3. Find and click: **launch-wizard-58**

### Step 2: Edit SSH Rule
1. Click **Inbound rules** tab
2. Find the **SSH** rule (Type: SSH, Port: 22, Source: `112.133.220.136/32`)
3. Click **Edit inbound rules** button (top right)

### Step 3: Change Source IP
1. Find the SSH rule in the list
2. Click the **Source** dropdown for that rule
3. Select: **Anywhere-IPv4** (or type `0.0.0.0/0`)
4. Click **Save rules** button

### Step 4: Wait 10-30 seconds
AWS needs a moment to apply the change.

---

## 🧪 Test SSH (After Fix)

**Run this command:**
```bash
cd "/Users/bhanukiran/Downloads/ACENTLE/UiP/URIP/Updated Code/RealEstate Intent AI Platform/intent-frontend-full-working"
./deploy/TEST_SSH.sh 44.202.189.78
```

**Expected output:**
```
✅ SSH connection successful!
✅ SSH works! You can now deploy.
```

---

## 🚀 Deploy (Once SSH Works)

```bash
./deploy/DEPLOY_EVERYTHING_FIXED.sh 44.202.189.78
```

---

## 📸 Visual Guide

**Before:**
```
SSH | TCP | 22 | 112.133.220.136/32  ← Only this IP
```

**After:**
```
SSH | TCP | 22 | 0.0.0.0/0  ← Any IP can connect
```

---

## ⚠️ If Still Failing

**Check:**
1. Did you click **Save rules**? (not just close)
2. Wait 30 seconds after saving
3. Try SSH again

**Alternative:** Add your current IP instead:
```bash
# Get your IP
curl -s https://checkip.amazonaws.com

# Then add that IP/32 to security group (keep existing rule, add new one)
```
