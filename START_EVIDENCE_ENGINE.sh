#!/bin/bash

# Start Evidence Engine on port 7007
# This script starts the Evidence Engine service

cd /Users/bhanukiran/Downloads/ACENTLE/UiP/uip-main/services/evidence-engine

echo "========================================="
echo "🚀 Starting Evidence Engine (Port 7007)"
echo "========================================="
echo ""

# Check if port 7007 is in use
if lsof -ti:7007 > /dev/null 2>&1; then
  echo "⚠️  Port 7007 is already in use"
  echo "Killing existing process..."
  lsof -ti:7007 | xargs kill -9 2>/dev/null
  sleep 1
fi

# Check if PostgreSQL is running
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
  echo "⚠️  PostgreSQL is not running"
  echo "Starting PostgreSQL..."
  cd /Users/bhanukiran/Downloads/ACENTLE/UiP/URIP/Updated\ Code/RealEstate\ Intent\ AI\ Platform/intent-frontend-full-working
  ./START_POSTGRES.sh
  sleep 3
fi

# Build Evidence Engine
echo "Building Evidence Engine..."
cd /Users/bhanukiran/Downloads/ACENTLE/UiP/uip-main/services/evidence-engine
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Build failed"
  exit 1
fi

# Start Evidence Engine
echo ""
echo "Starting Evidence Engine on port 7007..."
echo "Press Ctrl+C to stop"
echo ""

PORT=7007 npm start
