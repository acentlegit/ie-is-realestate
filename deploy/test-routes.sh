#!/bin/bash
# Test All Engine Routes - Run on EC2

echo "🧪 Testing Engine Routes"
echo "========================"
echo ""

# Test function
test_route() {
    local name=$1
    local port=$2
    local path=$3
    local method=$4
    local data=$5
    
    echo -n "  $name (port $port, $method $path): "
    
    if [ "$method" = "POST" ]; then
        response=$(curl -s -X POST "http://127.0.0.1:$port$path" \
            -H "Content-Type: application/json" \
            -d "$data" \
            -w "%{http_code}" -o /tmp/test_response.json 2>/dev/null)
    else
        response=$(curl -s -X GET "http://127.0.0.1:$port$path" \
            -w "%{http_code}" -o /tmp/test_response.json 2>/dev/null)
    fi
    
    if [ "$response" = "200" ]; then
        echo "✅ OK"
        cat /tmp/test_response.json | head -c 100
        echo ""
    elif [ "$response" = "405" ]; then
        echo "❌ 405 Method Not Allowed"
    elif [ "$response" = "404" ]; then
        echo "❌ 404 Not Found"
    elif [ "$response" = "000" ]; then
        echo "❌ Connection Refused (engine not running)"
    elif [ "$response" = "500" ]; then
        echo "⚠️  500 Internal Error (route works, code issue)"
    else
        echo "❌ HTTP $response"
    fi
}

# Test Health Endpoints (GET)
echo "🏥 Health Checks (GET):"
test_route "Intent" 7001 "/v1/health" "GET" ""
test_route "Compliance" 7002 "/v1/health" "GET" ""
test_route "Decision" 7003 "/v1/health" "GET" ""
test_route "Action" 7004 "/v1/health" "GET" ""
test_route "Risk" 7005 "/v1/health" "GET" ""
test_route "Explainability" 7006 "/v1/health" "GET" ""
test_route "Evidence" 7007 "/v1/health" "GET" ""
echo ""

# Test Execute Endpoints (POST)
echo "⚙️  Execute Endpoints (POST):"
test_route "Compliance" 7002 "/v1/execute" "POST" '{"intent":{"type":"BUY_PROPERTY","payload":{}}}'
test_route "Explainability" 7006 "/v1/execute" "POST" '{"intentId":"test","intentType":"BUY_PROPERTY"}'
test_route "Evidence" 7007 "/v1/execute" "POST" '{"intentId":"test","evidence":{}}'
echo ""

# Test via Nginx
echo "🌐 Testing via Nginx:"
echo -n "  /api/compliance/v1/execute: "
response=$(curl -s -X POST "http://localhost/api/compliance/v1/execute" \
    -H "Content-Type: application/json" \
    -d '{"intent":{"type":"BUY_PROPERTY"}}' \
    -w "%{http_code}" -o /dev/null 2>/dev/null)
[ "$response" = "200" ] && echo "✅ OK" || echo "❌ HTTP $response"

echo -n "  /api/explainability/v1/execute: "
response=$(curl -s -X POST "http://localhost/api/explainability/v1/execute" \
    -H "Content-Type: application/json" \
    -d '{"intentId":"test"}' \
    -w "%{http_code}" -o /dev/null 2>/dev/null)
[ "$response" = "200" ] && echo "✅ OK" || echo "❌ HTTP $response"

echo -n "  /api/evidence/v1/execute: "
response=$(curl -s -X POST "http://localhost/api/evidence/v1/execute" \
    -H "Content-Type: application/json" \
    -d '{"intentId":"test"}' \
    -w "%{http_code}" -o /dev/null 2>/dev/null)
[ "$response" = "200" ] && echo "✅ OK" || echo "❌ HTTP $response"
echo ""

echo "✅ Route testing complete!"
