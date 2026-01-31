#!/bin/bash
# Upload Services (Email, Video, Speech) to EC2

set -e

# Configuration
EC2_KEY="intent-platform-key.pem"
EC2_USER="ubuntu"
EC2_IP="${1:-YOUR_EC2_IP}"  # Pass EC2 IP as first argument
FRONTEND_DIR="/Users/bhanukiran/Downloads/ACENTLE/UiP/URIP/Updated Code/RealEstate Intent AI Platform/intent-frontend-full-working"

if [ "$EC2_IP" == "YOUR_EC2_IP" ]; then
    echo "❌ Error: Please provide EC2 IP address"
    echo "Usage: ./upload-services.sh YOUR_EC2_IP"
    exit 1
fi

echo "📦 Uploading services to EC2..."

cd "$FRONTEND_DIR"

# Upload email service
echo "📧 Uploading email service..."
scp -i "$EC2_KEY" -r email-service "$EC2_USER@$EC2_IP:/home/ubuntu/app/"

# Upload video service
echo "📹 Uploading video service..."
scp -i "$EC2_KEY" -r video-service "$EC2_USER@$EC2_IP:/home/ubuntu/app/"

# Upload speech service (optional)
if [ -d "speech-service" ]; then
    echo "🎤 Uploading speech service..."
    scp -i "$EC2_KEY" -r speech-service "$EC2_USER@$EC2_IP:/home/ubuntu/app/"
fi

echo "✅ Services uploaded successfully!"
echo ""
echo "Next steps on EC2:"
echo "  cd /home/ubuntu/app/email-service && npm install --production"
echo "  cd /home/ubuntu/app/video-service && npm install --production"
echo "  # Configure .env files for each service"
echo "  # Add to PM2: pm2 start server.js --name email-service"
