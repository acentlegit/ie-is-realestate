#!/bin/bash
# Quick script to check EC2 connectivity

EC2_IP="${1:-44.202.189.78}"
KEY_FILE="${2:-intent-platform-key.pem}"

echo "🔍 Checking EC2 connectivity..."
echo ""

# Test ping
echo "1️⃣ Testing ping..."
if ping -c 2 -W 2 "$EC2_IP" > /dev/null 2>&1; then
  echo "   ✅ Ping successful"
else
  echo "   ❌ Ping failed - Instance might be stopped or IP changed"
  echo "   → Check AWS Console → EC2 → Instances"
fi

echo ""

# Test SSH
echo "2️⃣ Testing SSH..."
if ssh -i "$KEY_FILE" -o ConnectTimeout=5 -o StrictHostKeyChecking=no ubuntu@"$EC2_IP" "echo 'SSH works!'" 2>/dev/null; then
  echo "   ✅ SSH connection successful"
  echo ""
  echo "✅ EC2 is reachable! You can deploy now."
else
  echo "   ❌ SSH connection failed"
  echo ""
  echo "🔧 Troubleshooting steps:"
  echo "   1. Check AWS Console → EC2 → Is instance Running?"
  echo "   2. Check Security Group → Does it allow SSH (port 22)?"
  echo "   3. Check Public IP → Has it changed?"
  echo "   4. Verify key file permissions: chmod 400 $KEY_FILE"
  echo ""
  echo "📖 See deploy/TROUBLESHOOT_SSH.md for detailed help"
fi
