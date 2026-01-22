#!/bin/bash
# Helper script to create evidence table
# This runs from the evidence-engine directory where pg package is installed

ROOT_DIR="/Users/bhanukiran/Downloads/ACENTLE/UiP/uip-main"
EVIDENCE_ENGINE_DIR="$ROOT_DIR/services/evidence-engine"

echo "========================================="
echo "📋 Creating Evidence Table"
echo "========================================="
echo ""

# Check if evidence-engine directory exists
if [ ! -d "$EVIDENCE_ENGINE_DIR" ]; then
  echo "❌ Error: Evidence engine directory not found: $EVIDENCE_ENGINE_DIR"
  exit 1
fi

# Change to evidence-engine directory
cd "$EVIDENCE_ENGINE_DIR" || exit 1

# Check if pg package is installed
if [ ! -d "node_modules/pg" ]; then
  echo "📦 Installing pg package..."
  npm install pg 2>&1 | grep -E "(up to date|added|WARN|ERROR)" || echo "✅ pg package installed"
else
  echo "✅ pg package already installed"
fi

echo ""
echo "🔧 Creating evidence table..."
echo ""
echo "💡 Tip: If connection fails, set these environment variables:"
echo "   export PGHOST=localhost"
echo "   export PGPORT=5432"
echo "   export PGDATABASE=intent_platform"
echo "   export PGUSER=postgres"
echo "   export PGPASSWORD=your_password"
echo ""

# Run the script
node create-evidence-table.js
