#!/bin/bash

echo "🚀 Starting All Dependencies for Action Engine..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Navigate to uip-main
cd /Users/bhanukiran/Downloads/ACENTLE/UiP/uip-main

echo -e "${YELLOW}1. Starting PostgreSQL and Redis with Docker Compose...${NC}"
docker-compose up -d postgres redis 2>&1 | grep -v "already exists" || echo "Docker services starting..."

echo ""
echo -e "${YELLOW}2. Waiting for services to be ready...${NC}"
sleep 5

echo ""
echo -e "${YELLOW}3. Checking Redis...${NC}"
if command -v redis-cli &> /dev/null; then
    if redis-cli ping 2>/dev/null | grep -q "PONG"; then
        echo -e "${GREEN}✅ Redis is running${NC}"
    else
        echo -e "${RED}❌ Redis is not responding${NC}"
        echo "   Starting Redis with Docker..."
        docker run -d --name redis-action-engine -p 6379:6379 redis:latest 2>/dev/null || echo "Redis container may already exist"
    fi
else
    echo -e "${YELLOW}⚠️  redis-cli not found, assuming Redis is running via Docker${NC}"
fi

echo ""
echo -e "${YELLOW}4. Checking PostgreSQL...${NC}"
if command -v psql &> /dev/null; then
    if psql -h localhost -U postgres -d intent_platform -c "SELECT 1;" 2>/dev/null | grep -q "1"; then
        echo -e "${GREEN}✅ PostgreSQL is running${NC}"
    else
        echo -e "${YELLOW}⚠️  PostgreSQL connection test failed, but Docker container may be starting...${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  psql not found, assuming PostgreSQL is running via Docker${NC}"
fi

echo ""
echo -e "${YELLOW}5. Starting Action Engine...${NC}"
cd services/action-engine

if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo ""
echo -e "${GREEN}▶ Starting Action Engine on port 7004...${NC}"
echo ""
npm run dev
