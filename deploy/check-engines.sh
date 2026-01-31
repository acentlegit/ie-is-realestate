#!/bin/bash
# Quick Engine Health Check - Run on EC2

echo "🔍 Engine Health Check"
echo "====================="
echo ""

# Check PM2 status
echo "📊 PM2 Status:"
pm2 status
echo ""

# Check if engines are listening
echo "🌐 Network Status:"
sudo netstat -tlnp | grep -E ':(7001|7002|7003|7004|7005|7006|7007)' || echo "No engines listening"
echo ""

# Test health endpoints
echo "🏥 Health Checks:"
for port in 7001 7002 7003 7004 7005 7006 7007; do
  name=$(case $port in
    7001) echo "intent";;
    7002) echo "compliance";;
    7003) echo "decision";;
    7004) echo "action";;
    7005) echo "risk";;
    7006) echo "explainability";;
    7007) echo "evidence";;
  esac)
  
  echo -n "Port $port ($name): "
  response=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:$port/v1/health 2>/dev/null)
  if [ "$response" = "200" ]; then
    echo "✅ OK"
  else
    echo "❌ Failed (HTTP $response)"
  fi
done
echo ""

# Test via Nginx
echo "🌐 Nginx Proxy Tests:"
for path in "intent" "compliance" "decision" "action" "risk" "explainability" "evidence"; do
  echo -n "/api/$path/v1/health: "
  response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/$path/v1/health 2>/dev/null)
  if [ "$response" = "200" ]; then
    echo "✅ OK"
  else
    echo "❌ Failed (HTTP $response)"
  fi
done
echo ""

# Check recent errors
echo "📋 Recent PM2 Errors (last 10 lines):"
pm2 logs --err --lines 10 --nostream
echo ""

echo "✅ Health check complete!"
