#!/bin/bash
# Upload Backend Engines to EC2

set -e

# Configuration
EC2_KEY="${EC2_KEY:-intent-platform-key.pem}"
EC2_USER="${EC2_USER:-ubuntu}"
EC2_IP="${1}"
KEY_PATH="${2}"  # Optional second argument for key path

# Validation
if [ -z "$EC2_IP" ]; then
    echo "❌ Error: EC2 IP address is required"
    echo ""
    echo "Usage:"
    echo "  ./deploy/upload-backend.sh YOUR_EC2_IP"
    echo ""
    echo "Example:"
    echo "  ./deploy/upload-backend.sh 44.202.189.78"
    exit 1
fi

# Get script directory and project root (before we change directories)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Use provided key path or try to find it
if [ -n "$KEY_PATH" ]; then
    EC2_KEY="$KEY_PATH"
elif [ ! -f "$EC2_KEY" ]; then
    # Try common locations relative to project root
    if [ -f "$PROJECT_ROOT/intent-platform-key.pem" ]; then
        EC2_KEY="$PROJECT_ROOT/intent-platform-key.pem"
    elif [ -f "$SCRIPT_DIR/intent-platform-key.pem" ]; then
        EC2_KEY="$SCRIPT_DIR/intent-platform-key.pem"
    elif [ -f "$HOME/.ssh/intent-platform-key.pem" ]; then
        EC2_KEY="$HOME/.ssh/intent-platform-key.pem"
    elif [ -f "./intent-platform-key.pem" ]; then
        EC2_KEY="./intent-platform-key.pem"
    else
        echo "❌ Error: SSH key file not found: $EC2_KEY"
        echo ""
        echo "Please provide the key file path as second argument:"
        echo "  ./deploy/upload-backend.sh 44.202.189.78 /path/to/key.pem"
        echo ""
        echo "Or set EC2_KEY environment variable:"
        echo "  export EC2_KEY=/path/to/key.pem"
        echo "  ./deploy/upload-backend.sh 44.202.189.78"
        exit 1
    fi
fi

# Verify key file exists and has correct permissions
if [ ! -f "$EC2_KEY" ]; then
    echo "❌ Error: SSH key file not found: $EC2_KEY"
    exit 1
fi

# Convert to absolute path (critical - we change directory later)
EC2_KEY="$(cd "$(dirname "$EC2_KEY")" && pwd)/$(basename "$EC2_KEY")"

# Set correct permissions on key file
chmod 400 "$EC2_KEY" 2>/dev/null || true

# Backend directory
BACKEND_DIR="/Users/bhanukiran/Downloads/ACENTLE/UiP/uip-main"

if [ ! -d "$BACKEND_DIR" ]; then
    echo "❌ Error: Backend directory not found: $BACKEND_DIR"
    echo ""
    echo "Please verify the backend directory exists, or update BACKEND_DIR in the script"
    exit 1
fi

echo "📦 Uploading backend engines to EC2..."
echo "   EC2 IP: $EC2_IP"
echo "   SSH Key: $EC2_KEY"
echo "   Backend: $BACKEND_DIR"
echo ""

cd "$BACKEND_DIR"

# Create deployment package
echo "📦 Creating deployment package..."
tar --exclude='node_modules' \
    --exclude='.git' \
    --exclude='logs' \
    --exclude='dist' \
    --exclude='*.log' \
    -czf /tmp/backend.tar.gz .

# Upload to EC2
echo "⬆️  Uploading to EC2 ($EC2_USER@$EC2_IP)..."
scp -i "$EC2_KEY" /tmp/backend.tar.gz "$EC2_USER@$EC2_IP:/home/ubuntu/"

# Cleanup
rm /tmp/backend.tar.gz

echo ""
echo "✅ Backend uploaded successfully!"
echo ""
echo "📝 Next steps on EC2:"
echo "   ssh -i $EC2_KEY $EC2_USER@$EC2_IP"
echo "   mkdir -p /home/ubuntu/app/backend"
echo "   cd /home/ubuntu/app/backend"
echo "   tar -xzf /home/ubuntu/backend.tar.gz"
echo "   rm /home/ubuntu/backend.tar.gz"
echo "   npm install"
echo "   npm run build --workspace=@uip/core"
echo "   npm run build --workspaces --if-present"
echo ""
echo "   See deploy/UPLOAD_AND_START_BACKEND.md for complete instructions"
