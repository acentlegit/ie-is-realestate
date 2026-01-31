#!/bin/bash
# Deploy Action Engine idempotency fix

set -e

EC2_IP="${1:-44.202.189.78}"
KEY_FILE="${2:-intent-platform-key.pem}"

# Get absolute path to key file
if [ ! -f "$KEY_FILE" ]; then
  KEY_FILE="$(cd "$(dirname "$0")/.." && pwd)/intent-platform-key.pem"
fi

if [ ! -f "$KEY_FILE" ]; then
  echo "❌ Key file not found: $KEY_FILE"
  exit 1
fi

echo "📦 Building Action Engine..."
cd "/Users/bhanukiran/Downloads/ACENTLE/UiP/uip-main/services/action-engine"
npm run build

if [ ! -d "dist" ]; then
  echo "❌ Build failed - dist directory not found"
  exit 1
fi

echo "📤 Uploading Action Engine to EC2..."
scp -i "$KEY_FILE" -r dist/* "ubuntu@$EC2_IP:/home/ubuntu/app/engines/action-engine/dist/"

echo "🔄 Restarting Action Engine..."
ssh -i "$KEY_FILE" "ubuntu@$EC2_IP" << 'EOF'
  pm2 restart action-engine
  sleep 2
  pm2 logs action-engine --lines 20 --nostream
EOF

echo ""
echo "✅ Action Engine fix deployed!"
echo "🧪 Test: Call /api/action/v1/execute twice - should return same action IDs"
