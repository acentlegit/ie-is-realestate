#!/bin/bash
# EC2 Setup Script - Run this ON the EC2 instance

set -e

echo "🚀 Setting up EC2 instance for Intent Platform..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
echo "📦 Installing Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# Install Python
echo "📦 Installing Python..."
sudo apt install -y python3 python3-pip python3-venv

# Install Nginx
echo "📦 Installing Nginx..."
sudo apt install -y nginx

# Install PM2
echo "📦 Installing PM2..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

# Install build tools
echo "📦 Installing build tools..."
sudo apt install -y build-essential git

# Create app directory
echo "📁 Creating app directory structure..."
mkdir -p /home/ubuntu/app/{backend,frontend,email-service,video-service,speech-service}

# Set permissions
sudo chown -R ubuntu:ubuntu /home/ubuntu/app
chmod -R 755 /home/ubuntu/app

# Verify installations
echo ""
echo "✅ Installation complete!"
echo ""
echo "Versions:"
node --version
npm --version
python3 --version
nginx -v
pm2 --version

echo ""
echo "📝 Next steps:"
echo "1. Upload backend code and extract to /home/ubuntu/app/backend"
echo "2. Upload frontend build to /home/ubuntu/app/frontend"
echo "3. Upload services to /home/ubuntu/app/"
echo "4. Configure PM2 ecosystem.config.js"
echo "5. Configure Nginx"
echo "6. Start all services"
