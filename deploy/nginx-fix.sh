#!/bin/bash
# Quick Nginx Config Fix - Run on EC2

echo "🔧 Fixing Nginx path stripping..."

# Backup current config
sudo cp /etc/nginx/sites-available/intent-platform /etc/nginx/sites-available/intent-platform.backup

# Create fixed config
sudo tee /etc/nginx/sites-available/intent-platform > /dev/null <<'EOF'
server {
    listen 80;
    server_name _;

    root /home/ubuntu/app/frontend;
    index index.html;

    # Frontend (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Intent Engine
    location /api/intent {
        rewrite ^/api/intent(.*)$ $1 break;
        proxy_pass http://127.0.0.1:7001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Compliance Engine
    location /api/compliance {
        rewrite ^/api/compliance(.*)$ $1 break;
        proxy_pass http://127.0.0.1:7002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Decision Engine
    location /api/decision {
        rewrite ^/api/decision(.*)$ $1 break;
        proxy_pass http://127.0.0.1:7003;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Action Engine
    location /api/action {
        rewrite ^/api/action(.*)$ $1 break;
        proxy_pass http://127.0.0.1:7004;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Risk Engine
    location /api/risk {
        rewrite ^/api/risk(.*)$ $1 break;
        proxy_pass http://127.0.0.1:7005;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Explainability Engine
    location /api/explainability {
        rewrite ^/api/explainability(.*)$ $1 break;
        proxy_pass http://127.0.0.1:7006;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Evidence Engine
    location /api/evidence {
        rewrite ^/api/evidence(.*)$ $1 break;
        proxy_pass http://127.0.0.1:7007;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Email Service
    location /api/email {
        rewrite ^/api/email(.*)$ $1 break;
        proxy_pass http://127.0.0.1:7008;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Video Service
    location /api/video {
        rewrite ^/api/video(.*)$ $1 break;
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Speech Service (WebSocket)
    location /ws/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
EOF

# Test config
echo "Testing Nginx config..."
if sudo nginx -t; then
    echo "✅ Config is valid"
    echo "Reloading Nginx..."
    sudo systemctl reload nginx
    echo "✅ Nginx reloaded"
    echo ""
    echo "🧪 Testing routes..."
    
    # Test explainability
    echo -n "Explainability: "
    curl -s -X POST "http://localhost/api/explainability/v1/execute" \
      -H "Content-Type: application/json" \
      -d '{"intentId":"test"}' \
      -w "HTTP: %{http_code}\n" | tail -1
    
    # Test compliance
    echo -n "Compliance: "
    curl -s -X POST "http://localhost/api/compliance/v1/execute" \
      -H "Content-Type: application/json" \
      -d '{"intent":{"type":"BUY_PROPERTY"}}' \
      -w "HTTP: %{http_code}\n" | tail -1
    
    # Test evidence
    echo -n "Evidence: "
    curl -s -X POST "http://localhost/api/evidence/v1/execute" \
      -H "Content-Type: application/json" \
      -d '{"intentId":"test"}' \
      -w "HTTP: %{http_code}\n" | tail -1
    
    echo ""
    echo "✅ Fix complete! Check browser - 405 errors should be gone."
else
    echo "❌ Config test failed. Restoring backup..."
    sudo cp /etc/nginx/sites-available/intent-platform.backup /etc/nginx/sites-available/intent-platform
    echo "Backup restored. Please fix manually."
    exit 1
fi
