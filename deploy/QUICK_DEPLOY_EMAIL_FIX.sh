#!/bin/bash
# Quick deploy script for email service fix

set -e

EC2_IP="${1:-44.202.189.78}"
KEY_FILE="${2:-intent-platform-key.pem}"

if [ ! -f "$KEY_FILE" ]; then
  echo "❌ Key file not found: $KEY_FILE"
  echo "Usage: $0 [EC2_IP] [KEY_FILE]"
  exit 1
fi

echo "📤 Uploading email service fix..."
scp -i "$KEY_FILE" email-service/server.js "ubuntu@$EC2_IP:/home/ubuntu/app/email-service/"

echo "🔄 Restarting email service..."
ssh -i "$KEY_FILE" "ubuntu@$EC2_IP" << 'EOF'
  pm2 restart email-service
  sleep 2
  pm2 logs email-service --lines 10 --nostream
EOF

echo "✅ Email service fix deployed!"
echo ""
echo "🧪 Test with:"
echo "  curl -X POST http://127.0.0.1:7008/v1/send -H 'Content-Type: application/json' -d '{\"to\":\"dev\",\"template\":\"INTENT_CREATED\",\"data\":{\"intentId\":\"test\"}}'"
