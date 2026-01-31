#!/bin/bash
# Complete Diagnostic Script - Run on EC2

echo "🔍 Complete Platform Diagnostics"
echo "================================="
echo ""

# 1. PM2 Status
echo "📊 PM2 Status:"
pm2 status
echo ""

# 2. Network Status
echo "🌐 Network Status (engines listening):"
sudo netstat -tlnp | grep -E ':(7001|7002|7003|7004|7005|7006|7007|7008|3002)' || echo "No engines listening"
echo ""

# 3. Health Checks
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
  
  echo -n "  Port $port ($name): "
  response=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:$port/v1/health 2>/dev/null)
  if [ "$response" = "200" ]; then
    echo "✅ OK"
  else
    echo "❌ Failed (HTTP $response)"
  fi
done
echo ""

# 4. Test Execute Endpoints (the ones failing)
echo "⚙️  Testing Execute Endpoints:"
echo ""

echo -n "  Compliance /v1/execute: "
response=$(curl -s -X POST http://127.0.0.1:7002/v1/execute \
  -H "Content-Type: application/json" \
  -d '{"intent":{"type":"BUY_PROPERTY","payload":{}}}' \
  -w "%{http_code}" -o /tmp/compliance_test.json 2>/dev/null)
if [ "$response" = "200" ]; then
  echo "✅ OK"
elif [ "$response" = "405" ]; then
  echo "❌ 405 Method Not Allowed"
elif [ "$response" = "000" ]; then
  echo "❌ Connection Refused (engine not running)"
else
  echo "❌ HTTP $response"
fi

echo -n "  Explainability /v1/execute: "
response=$(curl -s -X POST http://127.0.0.1:7006/v1/execute \
  -H "Content-Type: application/json" \
  -d '{"intent":{"type":"BUY_PROPERTY"}}' \
  -w "%{http_code}" -o /tmp/explainability_test.json 2>/dev/null)
if [ "$response" = "200" ]; then
  echo "✅ OK"
elif [ "$response" = "405" ]; then
  echo "❌ 405 Method Not Allowed"
elif [ "$response" = "000" ]; then
  echo "❌ Connection Refused (engine not running)"
else
  echo "❌ HTTP $response"
fi

echo -n "  Evidence /v1/execute: "
response=$(curl -s -X POST http://127.0.0.1:7007/v1/execute \
  -H "Content-Type: application/json" \
  -d '{"intentId":"test","evidence":{}}' \
  -w "%{http_code}" -o /tmp/evidence_test.json 2>/dev/null)
if [ "$response" = "200" ]; then
  echo "✅ OK"
elif [ "$response" = "405" ]; then
  echo "❌ 405 Method Not Allowed"
elif [ "$response" = "000" ]; then
  echo "❌ Connection Refused (engine not running)"
else
  echo "❌ HTTP $response"
fi
echo ""

# 5. Email Service
echo "📧 Email Service:"
pm2 status | grep email && echo "  ✅ Running" || echo "  ❌ Not running"
curl -s http://127.0.0.1:7008/health 2>/dev/null && echo "  ✅ Responding" || echo "  ❌ Not responding"
echo ""

# 6. Test via Nginx
echo "🌐 Testing via Nginx:"
echo -n "  /api/compliance/v1/execute: "
response=$(curl -s -X POST http://localhost/api/compliance/v1/execute \
  -H "Content-Type: application/json" \
  -d '{"intent":{"type":"BUY_PROPERTY"}}' \
  -w "%{http_code}" -o /dev/null 2>/dev/null)
if [ "$response" = "200" ]; then
  echo "✅ OK"
elif [ "$response" = "405" ]; then
  echo "❌ 405 (check engine routes)"
elif [ "$response" = "502" ]; then
  echo "❌ 502 (engine not running)"
else
  echo "❌ HTTP $response"
fi
echo ""

# 7. Recent Errors
echo "📋 Recent PM2 Errors (last 10 lines):"
pm2 logs --err --lines 10 --nostream 2>/dev/null || echo "  No errors found"
echo ""

# 8. Nginx Status
echo "🌐 Nginx Status:"
sudo systemctl status nginx --no-pager -l | head -5
echo ""

echo "✅ Diagnostics complete!"
echo ""
echo "📝 Next steps based on results:"
echo "  - If engines not running: pm2 restart all"
echo "  - If 405 errors: Check routes are registered"
echo "  - If 502 errors: Engine not running or Nginx config issue"
echo "  - If email service missing: Start email service with PM2"
