#!/bin/bash

echo "Checking Engine Status..."
echo ""

# Check Intent Engine
echo -n "Intent Engine (7001): "
if curl -s http://localhost:7001/v1/health > /dev/null 2>&1; then
    echo "✅ Running"
else
    echo "❌ Not running"
fi

# Check Compliance Engine
echo -n "Compliance Engine (7002): "
if curl -s http://localhost:7002/v1/health > /dev/null 2>&1; then
    echo "✅ Running"
else
    echo "❌ Not running"
fi

# Check Decision Engine
echo -n "Decision Engine (7003): "
if curl -s http://localhost:7003/v1/health > /dev/null 2>&1; then
    echo "✅ Running"
else
    echo "❌ Not running"
fi

# Check Action Engine
echo -n "Action Engine (7004): "
if curl -s http://localhost:7004/v1/health > /dev/null 2>&1; then
    echo "✅ Running"
else
    echo "❌ Not running"
fi

echo ""
echo "If engines are not running, start them with: ./START_ALL.sh"
