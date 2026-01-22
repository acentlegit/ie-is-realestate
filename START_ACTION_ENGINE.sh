#!/bin/bash

echo "🚀 Starting Action Engine..."
echo ""

cd /Users/bhanukiran/Downloads/ACENTLE/UiP/uip-main/services/action-engine

echo "Current directory: $(pwd)"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

echo "▶ Starting Action Engine on port 7004..."
echo ""
npm run dev
