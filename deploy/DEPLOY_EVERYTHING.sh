#!/bin/bash
# Deploy Action Engine + Frontend fixes (one script)

set -e

EC2_IP="${1:-44.202.189.78}"
KEY_FILE="${2:-intent-platform-key.pem}"

# Get absolute path to key file (in frontend directory)
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Convert to absolute path if relative
if [ ! -f "$KEY_FILE" ]; then
  # Try relative to script directory
  if [ -f "$SCRIPT_DIR/$KEY_FILE" ]; then
    KEY_FILE="$SCRIPT_DIR/$KEY_FILE"
  # Try absolute path
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
  echo "💡 Please provide key file path: $0 [EC2_IP] [KEY_FILE_PATH]"
  exit 1
fi

echo "✅ Using key file: $KEY_FILE"

echo "🔧 Step 1: Deploy Action Engine fix..."

# Build and deploy Action Engine
cd "/Users/bhanukiran/Downloads/ACENTLE/UiP/uip-main/services/action-engine"
npm run build
scp -i "$KEY_FILE" -r dist/* "ubuntu@$EC2_IP:/home/ubuntu/app/engines/action-engine/dist/"
ssh -i "$KEY_FILE" "ubuntu@$EC2_IP" "pm2 restart action-engine && sleep 2 && echo '✅ Action Engine restarted'"

echo ""
echo "🔧 Step 2: Deploy Frontend fix..."

# Build and deploy Frontend
cd "$SCRIPT_DIR"
if [ ! -d "dist" ]; then
  npm run build
fi
tar -czf dist.tar.gz dist/
scp -i "$KEY_FILE" dist.tar.gz "ubuntu@$EC2_IP:/home/ubuntu/"
ssh -i "$KEY_FILE" "ubuntu@$EC2_IP" "cd /home/ubuntu/app/frontend && tar -xzf ~/dist.tar.gz --strip-components=1 && sudo systemctl reload nginx && echo '✅ Frontend deployed'"

echo ""
echo "✅ All fixes deployed!"
echo "🧪 Test: http://$EC2_IP"
echo "📋 Check logs: ssh -i $KEY_FILE ubuntu@$EC2_IP 'pm2 logs action-engine --lines 20'"
