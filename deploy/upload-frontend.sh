#!/bin/bash
# Build and Upload Frontend to EC2

set -e

# Configuration
EC2_KEY="${EC2_KEY:-intent-platform-key.pem}"
EC2_USER="${EC2_USER:-ubuntu}"
EC2_IP="${1}"

# Validation
if [ -z "$EC2_IP" ]; then
    echo "❌ Error: EC2 IP address is required"
    echo ""
    echo "Usage:"
    echo "  ./deploy/upload-frontend.sh YOUR_EC2_IP"
    echo ""
    echo "Example:"
    echo "  ./deploy/upload-frontend.sh 44.202.189.78"
    echo ""
    echo "Or set environment variables:"
    echo "  export EC2_KEY=your-key.pem"
    echo "  export EC2_USER=ubuntu"
    echo "  ./deploy/upload-frontend.sh 44.202.189.78"
    exit 1
fi

# Check if key file exists
if [ ! -f "$EC2_KEY" ]; then
    echo "❌ Error: SSH key file not found: $EC2_KEY"
    echo "Please provide the correct path to your .pem file"
    exit 1
fi

FRONTEND_DIR="/Users/bhanukiran/Downloads/ACENTLE/UiP/URIP/Updated Code/RealEstate Intent AI Platform/intent-frontend-full-working"

echo "🎨 Building and uploading frontend..."
echo "   EC2 IP: $EC2_IP"
echo "   SSH Key: $EC2_KEY"
echo ""

cd "$FRONTEND_DIR"

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo "⚠️  Warning: .env.production not found. Creating default..."
    cat > .env.production << EOF
VITE_EMAIL_SERVICE_URL=/api/email
VITE_LIVEKIT_TOKEN_URL=/api/video/token
VITE_LIVEKIT_URL=wss://qhire-ai-interivew-xygij6p0.livekit.cloud
VITE_SPEECH_SERVICE_URL=/ws/transcribe
VITE_USE_WHISPER_BACKEND=false
VITE_USE_UNIFIED_ENGINE=false
EOF
    echo "✅ Created .env.production"
fi

# Remind: for EC2 HTTPS + Keycloak, set VITE_KEYCLOAK_URL=https://YOUR_IP:8443 in .env.production
if [ -f ".env.production" ] && ! grep -q "VITE_KEYCLOAK_URL=https" .env.production 2>/dev/null; then
    echo "💡 Tip: For EC2 with HTTPS, add VITE_KEYCLOAK_URL=https://YOUR_EC2_IP:8443 to .env.production to avoid 'form not secure' and Web Crypto errors."
fi

# Build frontend
echo "🔨 Building frontend..."
npm run build

if [ ! -d "dist" ]; then
    echo "❌ Error: Build failed - dist directory not found"
    exit 1
fi

# Verify build output doesn't contain hardcoded URLs
echo "🔍 Verifying build..."
if grep -r "localhost:700" dist/ 2>/dev/null || grep -r "127.0.0.1:700" dist/ 2>/dev/null; then
    echo "⚠️  Warning: Build contains hardcoded localhost URLs!"
    echo "   This may cause CORS errors. Check your .env.production file."
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✅ Build verified - no hardcoded URLs found"
fi

# Create deployment package
echo "📦 Creating deployment package..."
cd dist
tar -czf /tmp/frontend.tar.gz .

# Upload to EC2
echo "⬆️  Uploading to EC2 ($EC2_USER@$EC2_IP)..."
scp -i "$EC2_KEY" /tmp/frontend.tar.gz "$EC2_USER@$EC2_IP:/home/ubuntu/"

# Cleanup
rm /tmp/frontend.tar.gz
cd ..

echo ""
echo "✅ Frontend uploaded successfully!"
echo ""
echo "📝 Next steps on EC2:"
echo "   ssh -i $EC2_KEY $EC2_USER@$EC2_IP"
echo "   mkdir -p /home/ubuntu/app/frontend"
echo "   cd /home/ubuntu/app/frontend"
echo "   tar -xzf /home/ubuntu/frontend.tar.gz"
echo "   rm /home/ubuntu/frontend.tar.gz"
echo "   sudo chown -R ubuntu:ubuntu /home/ubuntu/app/frontend"
echo "   sudo systemctl restart nginx"
