#!/bin/bash
# Deploy frontend fixes to EC2

set -e

EC2_IP="${1:-44.202.189.78}"
KEY_FILE="${2:-intent-platform-key.pem}"

if [ ! -f "$KEY_FILE" ]; then
  echo "❌ Key file not found: $KEY_FILE"
  exit 1
fi

if [ ! -f "dist.tar.gz" ]; then
  echo "📦 Building frontend..."
  npm run build
  tar -czf dist.tar.gz dist/
fi

echo "📤 Uploading frontend to EC2..."
scp -i "$KEY_FILE" dist.tar.gz "ubuntu@$EC2_IP:/home/ubuntu/"

echo "🔄 Deploying on EC2..."
ssh -i "$KEY_FILE" "ubuntu@$EC2_IP" << 'EOF'
  cd /home/ubuntu/app/frontend
  tar -xzf ~/dist.tar.gz --strip-components=1
  sudo systemctl reload nginx
  echo "✅ Frontend deployed successfully!"
EOF

echo ""
echo "✅ Deployment complete!"
echo "🌐 Test at: http://$EC2_IP"
