#!/bin/bash

# Video Service Startup Script

echo "📹 Starting Video Service..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Navigate to script directory
cd "$(dirname "$0")"

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating template..."
    cat > .env << 'EOF'
LIVEKIT_API_KEY=your_api_key_here
LIVEKIT_SECRET=your_secret_here
LIVEKIT_URL=wss://qhire-ai-interivew-xygij6p0.livekit.cloud
VIDEO_SERVICE_PORT=3001
EOF
    echo "📝 Please edit .env file with your LiveKit credentials"
    echo "   Get them from: https://cloud.livekit.io/"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the service
echo "🚀 Starting video service on port 3001..."
echo ""
node server.js
