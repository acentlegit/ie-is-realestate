# 🔧 Troubleshoot SSH Connection Timeout

**Error:** `ssh: connect to host 44.202.189.78 port 22: Operation timed out`

---

## 🔍 Possible Causes

1. **EC2 instance stopped/terminated**
2. **Security group blocking SSH (port 22)**
3. **IP address changed (if using dynamic IP)**
4. **Network/firewall blocking connection**
5. **EC2 instance in different region/VPC**

---

## ✅ Step 1: Check EC2 Status

**Go to AWS Console:**
1. Open AWS Console → EC2
2. Check instance status:
   - ✅ **Running** = Instance is up
   - ⚠️ **Stopped** = Need to start it
   - ❌ **Terminated** = Instance deleted (need new one)

---

## ✅ Step 2: Check Security Group

**In AWS Console → EC2 → Security Groups:**

**Find your instance's security group and verify:**

| Type | Protocol | Port Range | Source |
|------|----------|------------|--------|
| SSH | TCP | 22 | **Your IP** or `0.0.0.0/0` |

**If SSH rule missing:**
1. Edit Security Group
2. Add Inbound Rule:
   - Type: SSH
   - Port: 22
   - Source: Your IP (or `0.0.0.0/0` for testing)

---

## ✅ Step 3: Check IP Address

**EC2 instances get new IPs when:**
- Stopped and restarted (if not using Elastic IP)
- Terminated and recreated

**Check current IP:**
1. AWS Console → EC2 → Instances
2. Select your instance
3. Check **Public IPv4 address**
4. Update your commands with new IP

---

## ✅ Step 4: Test Connection

**Try basic ping first:**

```bash
ping -c 3 44.202.189.78
```

**If ping fails:**
- Instance might be stopped
- IP address changed
- Security group blocking ICMP

**If ping works but SSH fails:**
- Security group blocking port 22
- SSH service not running on instance

---

## ✅ Step 5: Alternative - Use AWS Systems Manager (SSM)

**If SSH is blocked, use SSM Session Manager:**

```bash
# Install AWS CLI and SSM plugin
aws ssm start-session --target i-<instance-id>
```

**Prerequisites:**
- Instance must have SSM agent installed
- IAM role with SSM permissions

---

## ✅ Step 6: Check Instance Logs

**In AWS Console:**
1. EC2 → Instances → Select instance
2. Actions → Monitor and troubleshoot → Get system log
3. Check for errors

---

## 🚀 Quick Fixes

### Fix 1: Restart Instance

```bash
# In AWS Console
EC2 → Instances → Select instance → Instance State → Start
```

**Wait 1-2 minutes, then try SSH again**

### Fix 2: Update Security Group

```bash
# In AWS Console
EC2 → Security Groups → Select your SG → Inbound Rules → Edit
# Add: SSH, Port 22, Source: 0.0.0.0/0 (or your IP)
```

### Fix 3: Get New IP

```bash
# In AWS Console
EC2 → Instances → Select instance → Check Public IPv4
# Update your commands with new IP
```

---

## 📋 Deployment Checklist

**Before deploying, verify:**

- [ ] EC2 instance is **Running**
- [ ] Security group allows **SSH (port 22)** from your IP
- [ ] Public IP address is correct
- [ ] Key file (`intent-platform-key.pem`) has correct permissions: `chmod 400 intent-platform-key.pem`
- [ ] You're using the correct key file

---

## 🔄 Alternative Deployment Method

**If SSH still doesn't work, use AWS Console:**

1. **Stop instance**
2. **Detach root volume**
3. **Attach to another instance** (or use AWS Systems Manager)
4. **Mount volume and copy files**
5. **Unmount and reattach to original instance**
6. **Start instance**

**Or use:**
- **AWS CodeDeploy**
- **AWS Systems Manager Run Command**
- **S3 + User Data Script**

---

## 🎯 Most Likely Issue

**Based on timeout error:**

1. **Instance stopped** (most common)
   - **Fix:** Start instance in AWS Console

2. **Security group blocking SSH**
   - **Fix:** Add SSH rule to security group

3. **IP address changed**
   - **Fix:** Check new IP in AWS Console

---

## ✅ Verify Connection

**Once fixed, test:**

```bash
# Test SSH
ssh -i intent-platform-key.pem ubuntu@44.202.189.78 "echo 'SSH works!'"

# If successful, deploy
cd "/Users/bhanukiran/Downloads/ACENTLE/UiP/URIP/Updated Code/RealEstate Intent AI Platform/intent-frontend-full-working"
tar -czf dist.tar.gz dist/
scp -i intent-platform-key.pem dist.tar.gz ubuntu@44.202.189.78:/home/ubuntu/
ssh -i intent-platform-key.pem ubuntu@44.202.189.78 "cd /home/ubuntu/app/frontend && tar -xzf ~/dist.tar.gz --strip-components=1 && sudo systemctl reload nginx"
```

---

## 📞 Next Steps

1. **Check AWS Console** → EC2 → Verify instance status
2. **Check Security Group** → Verify SSH rule exists
3. **Get current IP** → Update commands if changed
4. **Try SSH again** → Should work after fixes
