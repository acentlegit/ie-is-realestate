#!/bin/bash

echo "🚀 Starting Keycloak..."

# Check if Docker is running
if ! docker ps > /dev/null 2>&1; then
    echo "❌ Docker is not running!"
    echo "Please start Docker Desktop first, then run this script again."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Try to find docker-compose.yml with Keycloak
KEYCLOAK_COMPOSE=""
if [ -f "/Users/bhanukiran/Downloads/ACENTLE/UiP/URIP/Updated Code/RealEstate Intent AI Platform/intent-platform-github-monorepo/backend/docker-compose.yml" ]; then
    KEYCLOAK_COMPOSE="/Users/bhanukiran/Downloads/ACENTLE/UiP/URIP/Updated Code/RealEstate Intent AI Platform/intent-platform-github-monorepo/backend/docker-compose.yml"
    cd "/Users/bhanukiran/Downloads/ACENTLE/UiP/URIP/Updated Code/RealEstate Intent AI Platform/intent-platform-github-monorepo/backend"
elif [ -f "/Users/bhanukiran/Downloads/ACENTLE/UiP/uip-main/docker-compose.yml" ]; then
    KEYCLOAK_COMPOSE="/Users/bhanukiran/Downloads/ACENTLE/UiP/uip-main/docker-compose.yml"
    cd /Users/bhanukiran/Downloads/ACENTLE/UiP/uip-main
fi

if [ -z "$KEYCLOAK_COMPOSE" ]; then
    echo "⚠️  No docker-compose.yml found. Starting Keycloak with default command..."
    docker run -d \
        --name intent-keycloak \
        -p 8080:8080 \
        -e KEYCLOAK_ADMIN=admin \
        -e KEYCLOAK_ADMIN_PASSWORD=admin \
        quay.io/keycloak/keycloak:24.0 \
        start-dev
else
    echo "📋 Using docker-compose.yml: $KEYCLOAK_COMPOSE"
    docker compose up -d keycloak postgres
fi

echo ""
echo "⏳ Waiting for Keycloak to be ready (this may take 30-60 seconds)..."
echo "   (This is normal - Keycloak takes time to start)"

for i in {1..60}; do
    if curl -s http://localhost:8080/health/ready > /dev/null 2>&1; then
        echo ""
        echo "✅ Keycloak is ready!"
        echo "🌐 Access at: http://localhost:8080"
        echo "🔐 Admin console: http://localhost:8080 (admin/admin)"
        echo ""
        echo "✅ You can now refresh your browser at http://127.0.0.1:3000"
        exit 0
    fi
    echo -n "."
    sleep 1
done

echo ""
echo "⚠️  Keycloak is taking longer than expected."
echo "Check status with: docker ps | grep keycloak"
echo "Check logs with: docker logs intent-keycloak"
echo ""
echo "You can try refreshing http://127.0.0.1:3000 in a few moments"
