#!/bin/bash
# Quick SSH connection test

EC2_IP="${1:-44.202.189.78}"
KEY_FILE="/Users/bhanukiran/Downloads/ACENTLE/UiP/URIP/Updated Code/RealEstate Intent AI Platform/intent-frontend-full-working/intent-platform-key.pem"

echo "🔍 Testing SSH connection to $EC2_IP..."
echo ""

# Test 1: Check key file
if [ ! -f "$KEY_FILE" ]; then
  echo "❌ Key file not found: $KEY_FILE"
  exit 1
fi

# Test 2: Check key permissions
if [ "$(stat -f %A "$KEY_FILE" 2>/dev/null || stat -c %a "$KEY_FILE" 2>/dev/null)" != "600" ]; then
  echo "⚠️  Fixing key permissions..."
  chmod 600 "$KEY_FILE"
fi

# Test 3: SSH connection
echo "📡 Attempting SSH connection..."
if ssh -i "$KEY_FILE" -o ConnectTimeout=10 -o StrictHostKeyChecking=no ubuntu@$EC2_IP "echo '✅ SSH connection successful!'" 2>&1; then
  echo ""
  echo "✅ SSH works! You can now deploy."
  echo ""
  echo "🚀 Next step:"
  echo "   ./deploy/DEPLOY_EVERYTHING_FIXED.sh $EC2_IP"
else
  echo ""
  echo "❌ SSH connection failed!"
  echo ""
  echo "💡 Check Security Group:"
  echo "   1. AWS Console → EC2 → Security Groups"
  echo "   2. Find: launch-wizard-58"
  echo "   3. Inbound Rules → Should have:"
  echo "      Type: SSH | Port: 22 | Source: 0.0.0.0/0 (or your IP)"
  echo ""
  echo "📋 If rule missing:"
  echo "   - Edit Inbound Rules → Add Rule"
  echo "   - Type: SSH, Port: 22, Source: 0.0.0.0/0"
  echo "   - Save"
  exit 1
fi
