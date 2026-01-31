#!/bin/bash
# Start Backend Engines on EC2 - Run this ON the EC2 instance

set -e

echo "🚀 Starting Backend Engines on EC2"
echo "=================================="
echo ""

BACKEND_DIR="/home/ubuntu/app/backend"

# Check if backend directory exists
if [ ! -d "$BACKEND_DIR" ]; then
    echo "❌ Backend directory not found: $BACKEND_DIR"
    echo "Please upload backend code first"
    exit 1
fi

cd "$BACKEND_DIR"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build engines
echo "🔨 Building engines..."
npm run build --workspace=@uip/core 2>/dev/null || echo "⚠️  @uip/core build skipped (may already be built)"
npm run build --workspaces --if-present

# Check if ecosystem.config.js exists
if [ ! -f "ecosystem.config.js" ]; then
    echo "📝 Creating ecosystem.config.js..."
    cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'intent-engine',
      script: 'services/intent-engine/dist/index.js',
      env: { PORT: 7001, HOST: '127.0.0.1', NODE_ENV: 'production' },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '500M'
    },
    {
      name: 'compliance-engine',
      script: 'services/compliance-engine/dist/index.js',
      env: { PORT: 7002, HOST: '127.0.0.1', NODE_ENV: 'production' },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '500M'
    },
    {
      name: 'decision-engine',
      script: 'services/decision-engine/dist/index.js',
      env: { PORT: 7003, HOST: '127.0.0.1', NODE_ENV: 'production' },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '500M'
    },
    {
      name: 'action-engine',
      script: 'services/action-engine/dist/index.js',
      env: { PORT: 7004, HOST: '127.0.0.1', NODE_ENV: 'production' },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '500M'
    },
    {
      name: 'risk-engine',
      script: 'services/risk-engine/dist/index.js',
      env: { PORT: 7005, HOST: '127.0.0.1', NODE_ENV: 'production' },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '500M'
    },
    {
      name: 'explainability-engine',
      script: 'services/explainability-engine/dist/index.js',
      env: { PORT: 7006, HOST: '127.0.0.1', NODE_ENV: 'production' },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '500M'
    },
    {
      name: 'evidence-engine',
      script: 'services/evidence-engine/dist/index.js',
      env: { PORT: 7007, HOST: '127.0.0.1', NODE_ENV: 'production' },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '500M'
    }
  ]
};
EOF
    echo "✅ Created ecosystem.config.js"
fi

# Stop existing PM2 processes
echo "🛑 Stopping existing engines..."
pm2 delete all 2>/dev/null || true

# Start engines
echo "🚀 Starting engines..."
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup (if not done)
echo ""
echo "📋 PM2 startup configuration:"
pm2 startup || echo "⚠️  PM2 startup already configured"

echo ""
echo "✅ Engines started!"
echo ""
echo "📊 Status:"
pm2 status

echo ""
echo "🔍 Verifying engines are listening..."
sleep 2
sudo netstat -tlnp | grep -E ':(7001|7002|7003|7004|7005|7006|7007)' || echo "⚠️  Engines may still be starting..."

echo ""
echo "🧪 Testing health endpoints..."
curl -s http://127.0.0.1:7001/v1/health && echo " ✅ Intent Engine" || echo " ❌ Intent Engine"
curl -s http://127.0.0.1:7002/v1/health && echo " ✅ Compliance Engine" || echo " ❌ Compliance Engine"
curl -s http://127.0.0.1:7003/v1/health && echo " ✅ Decision Engine" || echo " ❌ Decision Engine"

echo ""
echo "✅ Done! Engines should now be accessible via Nginx at /api/..."
