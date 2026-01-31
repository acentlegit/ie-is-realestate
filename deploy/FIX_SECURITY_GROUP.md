# 🔒 Fix Security Group for SSH Access

## Current Issue

Your security group `launch-wizard-58` has SSH restricted to:
- **IP:** `112.133.220.136/32` (only this IP can SSH)

If your current IP is different, SSH will timeout.

---

## ✅ Solution: Update SSH Rule

### Option 1: Allow SSH from Anywhere (Recommended for Testing)

**In AWS Console:**

1. **EC2 → Security Groups → launch-wizard-58**
2. **Inbound Rules tab → Edit inbound rules**
3. **Find the SSH rule** (sgr-04076a45566976bf7)
4. **Click Edit** on that rule
5. **Change Source:**
   - From: `112.133.220.136/32`
   - To: `0.0.0.0/0` (allows from anywhere)
6. **Save rules**

**⚠️ Security Note:** This allows SSH from any IP. For production, use Option 2.

---

### Option 2: Add Your Current IP (More Secure)

**Step 1: Find Your Current IP**

```bash
# Run this command to see your IP:
curl -s https://checkip.amazonaws.com
```

**Step 2: Add Your IP to Security Group**

1. **EC2 → Security Groups → launch-wizard-58**
2. **Inbound Rules tab → Edit inbound rules**
3. **Add rule:**
   - Type: **SSH**
   - Port: **22**
   - Source: **Your IP/32** (e.g., `123.45.67.89/32`)
   - Description: `My current IP`
4. **Save rules**

**✅ Result:** You can SSH, but others cannot.

---

### Option 3: Keep Both IPs

1. **Keep existing rule** (`112.133.220.136/32`)
2. **Add new rule** with your current IP
3. **Both IPs can SSH**

---

## 🧪 Test After Fix

**Wait 10-30 seconds for AWS to apply the rule, then:**

```bash
cd "/Users/bhanukiran/Downloads/ACENTLE/UiP/URIP/Updated Code/RealEstate Intent AI Platform/intent-frontend-full-working"
./deploy/TEST_SSH.sh 44.202.189.78
```

**Or manually:**
```bash
ssh -i "/Users/bhanukiran/Downloads/ACENTLE/UiP/URIP/Updated Code/RealEstate Intent AI Platform/intent-frontend-full-working/intent-platform-key.pem" ubuntu@44.202.189.78 "echo 'SSH works!'"
```

---

## 🚀 Once SSH Works

**Deploy fixes:**
```bash
./deploy/DEPLOY_EVERYTHING_FIXED.sh 44.202.189.78
```

---

## 📋 Quick Reference

| Current Rule | Action |
|-------------|--------|
| SSH from `112.133.220.136/32` only | Change to `0.0.0.0/0` OR add your IP |

**Recommended:** Change to `0.0.0.0/0` for now, then restrict later if needed.
