#!/bin/bash

echo "Starting Frontend Server..."

cd "/Users/bhanukiran/Downloads/ACENTLE/UiP/URIP/Updated Code/RealEstate Intent AI Platform/intent-frontend-full-working"

# Kill any existing vite processes
pkill -9 -f vite 2>/dev/null || true
sleep 1

# Start the server in foreground (so you can see errors)
echo "Starting on http://127.0.0.1:3000"
echo "Press Ctrl+C to stop"
echo ""

npm run dev
