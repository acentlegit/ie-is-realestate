#!/bin/bash
# Phase 12 - Start All Services for Testing

set -e

echo "========================================="
echo "🚀 Phase 12 - Start All Services"
echo "========================================="
echo ""

ROOT_DIR="/Users/bhanukiran/Downloads/ACENTLE/UiP/uip-main"

# Check if services are already running
check_and_kill() {
  local port=$1
  local name=$2
  
  if lsof -ti:$port > /dev/null 2>&1; then
    echo "⚠️  Port $port is in use ($name)"
    read -p "Kill existing process? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      echo "Killing process on port $port..."
      lsof -ti:$port | xargs kill -9 2>/dev/null || true
      sleep 1
      echo "✅ Port $port freed"
    else
      echo "⚠️  Keeping existing process (assuming it's $name)"
    fi
  fi
}

# Check ports
echo "Step 1: Checking ports..."
check_and_kill 7007 "Evidence Engine"
check_and_kill 7001 "Intent Engine"
check_and_kill 7002 "Compliance Engine"
echo ""

# Start Evidence Engine
echo "Step 2: Starting Evidence Engine (port 7007)..."
cd "$ROOT_DIR/services/evidence-engine"
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi
if [ ! -d "dist" ]; then
  echo "Building TypeScript..."
  npm run build
fi
PORT=7007 npm start &
EVIDENCE_PID=$!
echo "Evidence Engine started (PID: $EVIDENCE_PID)"
sleep 2

# Verify Evidence Engine
if curl -s http://localhost:7007/v1/health > /dev/null 2>&1; then
  echo "✅ Evidence Engine is running"
else
  echo "❌ Evidence Engine failed to start"
  exit 1
fi
echo ""

# Start Intent Engine
echo "Step 3: Starting Intent Engine (port 7001)..."
cd "$ROOT_DIR/services/intent-engine"
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi
if [ ! -d "dist" ]; then
  echo "Building TypeScript..."
  npm run build
fi
PORT=7001 npm start &
INTENT_PID=$!
echo "Intent Engine started (PID: $INTENT_PID)"
sleep 2

# Verify Intent Engine
if curl -s http://localhost:7001/v1/health > /dev/null 2>&1; then
  echo "✅ Intent Engine is running"
else
  echo "❌ Intent Engine failed to start"
  exit 1
fi
echo ""

# Start Compliance Engine
echo "Step 4: Starting Compliance Engine (port 7002)..."
cd "$ROOT_DIR/services/compliance-engine"
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi
if [ ! -d "dist" ]; then
  echo "Building TypeScript..."
  npm run build
fi
PORT=7002 npm start &
COMPLIANCE_PID=$!
echo "Compliance Engine started (PID: $COMPLIANCE_PID)"
sleep 2

# Verify Compliance Engine
if curl -s http://localhost:7002/v1/health > /dev/null 2>&1; then
  echo "✅ Compliance Engine is running"
else
  echo "❌ Compliance Engine failed to start"
  exit 1
fi
echo ""

echo "========================================="
echo "✅ All Services Started"
echo "========================================="
echo ""
echo "Service PIDs:"
echo "  Evidence Engine: $EVIDENCE_PID (port 7007)"
echo "  Intent Engine: $INTENT_PID (port 7001)"
echo "  Compliance Engine: $COMPLIANCE_PID (port 7002)"
echo ""
echo "Health Checks:"
echo "  Evidence: http://localhost:7007/v1/health"
echo "  Intent: http://localhost:7001/v1/health"
echo "  Compliance: http://localhost:7002/v1/health"
echo ""
echo "Swagger Docs:"
echo "  Evidence: http://localhost:7007/docs"
echo "  Intent: http://localhost:7001/docs"
echo "  Compliance: http://localhost:7002/docs"
echo ""
echo "To stop all services:"
echo "  kill $EVIDENCE_PID $INTENT_PID $COMPLIANCE_PID"
echo ""
echo "Now run tests:"
echo "  ./QUICK_TEST_PHASE12.sh"
echo ""
