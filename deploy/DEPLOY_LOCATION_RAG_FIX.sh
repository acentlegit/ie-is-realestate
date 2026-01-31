#!/bin/bash
# Deploy location extraction and RAG insights fixes

set -e

EC2_IP="${1:-44.202.189.78}"
KEY_FILE="/Users/bhanukiran/Downloads/ACENTLE/UiP/URIP/Updated Code/RealEstate Intent AI Platform/intent-frontend-full-working/intent-platform-key.pem"

echo "🔧 Deploying Location & RAG Insights Fix..."
echo ""

# Build frontend
echo "📦 Building frontend..."
cd "/Users/bhanukiran/Downloads/ACENTLE/UiP/URIP/Updated Code/RealEstate Intent AI Platform/intent-frontend-full-working"
npm run build

if [ ! -d "dist" ]; then
  echo "❌ Build failed - dist directory not found"
  exit 1
fi

echo "✅ Build successful"
echo ""

# Package and upload
echo "📤 Uploading to EC2..."
tar -czf dist.tar.gz dist/
scp -i "$KEY_FILE" dist.tar.gz "ubuntu@$EC2_IP:/home/ubuntu/"

echo "🔄 Deploying on EC2..."
ssh -i "$KEY_FILE" ubuntu@$EC2_IP << 'EOF'
  cd /home/ubuntu/app/frontend
  tar -xzf ~/dist.tar.gz --strip-components=1
  rm ~/dist.tar.gz
  sudo systemctl reload nginx
  echo "✅ Frontend deployed"
EOF

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🧪 Test:"
echo "   1. Open: http://$EC2_IP"
echo "   2. Type: 'Buy a home in Mumbai for 2 crores'"
echo "   3. Verify:"
echo "      - Location shows 'Mumbai' (not 'unknown location')"
echo "      - Knowledge-Based Insights section shows content"
echo "      - Insights mention Mumbai"
