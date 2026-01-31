#!/bin/bash
# Deploy Action Engine + Frontend fixes (with directory creation)

set -e

EC2_IP="${1:-44.202.189.78}"
KEY_FILE="${2:-intent-platform-key.pem}"

# Get absolute path to key file (in frontend directory)
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Convert to absolute path if relative
if [ ! -f "$KEY_FILE" ]; then
  if [ -f "$SCRIPT_DIR/$KEY_FILE" ]; then
    KEY_FILE="$SCRIPT_DIR/$KEY_FILE"
  elif [ -f "/Users/bhanukiran/Downloads/ACENTLE/UiP/URIP/Updated Code/RealEstate Intent AI Platform/intent-frontend-full-working/intent-platform-key.pem" ]; then
    KEY_FILE="/Users/bhanukiran/Downloads/ACENTLE/UiP/URIP/Updated Code/RealEstate Intent AI Platform/intent-frontend-full-working/intent-platform-key.pem"
  fi
fi

# Convert to absolute path (required for scp/ssh when changing directories)
if [ -f "$KEY_FILE" ] && [[ "$KEY_FILE" != /* ]]; then
  KEY_FILE="$(cd "$(dirname "$KEY_FILE")" && pwd)/$(basename "$KEY_FILE")"
fi

if [ ! -f "$KEY_FILE" ]; then
  echo "❌ Key file not found: $KEY_FILE"
  exit 1
fi

echo "✅ Using key file: $KEY_FILE"
echo ""

# Test SSH connection first
echo "🔍 Testing SSH connection..."
if ! ssh -i "$KEY_FILE" -o ConnectTimeout=5 -o StrictHostKeyChecking=no ubuntu@$EC2_IP "echo 'SSH works!'" 2>/dev/null; then
  echo "❌ SSH connection failed!"
  echo "💡 Possible causes:"
  echo "   1. EC2 instance is stopped (check AWS Console)"
  echo "   2. Security group blocking SSH (port 22)"
  echo "   3. IP address changed"
  echo ""
  echo "📋 Check: AWS Console → EC2 → Instances → Verify instance is Running"
  exit 1
fi

echo "✅ SSH connection successful"
echo ""

echo "🔧 Step 1: Deploy Action Engine fix..."

# Build Action Engine
cd "/Users/bhanukiran/Downloads/ACENTLE/UiP/uip-main/services/action-engine"
echo "📦 Building Action Engine..."
npm run build

if [ ! -d "dist" ]; then
  echo "❌ Action Engine build failed"
  exit 1
fi

# Create directory structure on EC2 if it doesn't exist
echo "📁 Creating directory structure on EC2..."
ssh -i "$KEY_FILE" ubuntu@$EC2_IP << 'EOF'
  mkdir -p /home/ubuntu/app/engines/action-engine/dist
  echo "✅ Directory created"
EOF

# Upload Action Engine
echo "📤 Uploading Action Engine..."
scp -i "$KEY_FILE" -r dist/* "ubuntu@$EC2_IP:/home/ubuntu/app/engines/action-engine/dist/"

# Restart Action Engine
echo "🔄 Restarting Action Engine..."
ssh -i "$KEY_FILE" ubuntu@$EC2_IP << 'EOF'
  pm2 restart action-engine
  sleep 2
  pm2 logs action-engine --lines 10 --nostream
EOF

echo ""
echo "🔧 Step 2: Deploy Frontend fix..."

# Build and deploy Frontend
cd "$SCRIPT_DIR"
if [ ! -d "dist" ]; then
  echo "📦 Building Frontend..."
  npm run build
fi

echo "📤 Uploading Frontend..."
tar -czf dist.tar.gz dist/
scp -i "$KEY_FILE" dist.tar.gz "ubuntu@$EC2_IP:/home/ubuntu/"

echo "🔄 Deploying Frontend..."
ssh -i "$KEY_FILE" ubuntu@$EC2_IP << 'EOF'
  cd /home/ubuntu/app/frontend
  tar -xzf ~/dist.tar.gz --strip-components=1
  sudo systemctl reload nginx
  echo "✅ Frontend deployed"
EOF

echo ""
echo "✅ All fixes deployed!"
echo "🧪 Test: http://$EC2_IP"
echo "📋 Check logs: ssh -i $KEY_FILE ubuntu@$EC2_IP 'pm2 logs action-engine --lines 20'"
