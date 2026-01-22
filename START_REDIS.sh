#!/bin/bash

echo "Starting Redis containers..."

# Start Redis for Intent Platform
echo "Starting redis-intent-platform..."
docker start redis-intent-platform 2>/dev/null || echo "Container redis-intent-platform not found"

# Start Redis for Action Engine
echo "Starting redis-action-engine..."
docker start redis-action-engine 2>/dev/null || echo "Container redis-action-engine not found"

# Wait a moment
sleep 2

# Verify
echo ""
echo "Redis containers status:"
docker ps | grep redis || echo "No Redis containers running"

echo ""
echo "✅ Done!"
