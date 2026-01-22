#!/bin/bash

echo "========================================="
echo "🚀 Starting Intent Platform Services"
echo "========================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Start Keycloak (if using Docker)
echo -e "${YELLOW}1. Starting Keycloak...${NC}"
cd /Users/bhanukiran/Downloads/ACENTLE/UiP/uip-main
if [ -f "docker-compose.yml" ]; then
    docker-compose up -d keycloak postgres 2>/dev/null || echo "Docker services may already be running or not configured"
else
    echo "docker-compose.yml not found, skipping Docker services"
fi

# 2. Start UIP Engines
echo -e "${YELLOW}2. Starting UIP Engines...${NC}"
cd /Users/bhanukiran/Downloads/ACENTLE/UiP/uip-main

# Start Intent Engine (port 7001)
echo "  ▶ Starting Intent Engine (port 7001)..."
cd services/intent-engine
npm run start > /tmp/intent-engine.log 2>&1 &
INTENT_PID=$!
echo "  ✅ Intent Engine started (PID: $INTENT_PID)"

# Start Compliance Engine (port 7002)
echo "  ▶ Starting Compliance Engine (port 7002)..."
cd ../compliance-engine
npm run start > /tmp/compliance-engine.log 2>&1 &
COMPLIANCE_PID=$!
echo "  ✅ Compliance Engine started (PID: $COMPLIANCE_PID)"

# Start Decision Engine (port 7003)
echo "  ▶ Starting Decision Engine (port 7003)..."
cd ../decision-engine
npm run start > /tmp/decision-engine.log 2>&1 &
DECISION_PID=$!
echo "  ✅ Decision Engine started (PID: $DECISION_PID)"

# Start Action Engine (port 7004)
echo "  ▶ Starting Action Engine (port 7004)..."
cd ../action-engine
npm run start > /tmp/action-engine.log 2>&1 &
ACTION_PID=$!
echo "  ✅ Action Engine started (PID: $ACTION_PID)"

# 3. Start Frontend
echo -e "${YELLOW}3. Starting Frontend...${NC}"
cd /Users/bhanukiran/Downloads/ACENTLE/UiP/URIP/Updated\ Code/RealEstate\ Intent\ AI\ Platform/intent-frontend-full-working
npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "  ✅ Frontend started (PID: $FRONTEND_PID)"

# Wait a bit for services to start
echo ""
echo -e "${YELLOW}Waiting 5 seconds for services to initialize...${NC}"
sleep 5

# Check if services are running
echo ""
echo "========================================="
echo -e "${GREEN}✅ All Services Started${NC}"
echo "========================================="
echo ""
echo "Service Status:"
echo "  • Keycloak:        http://localhost:8080"
echo "  • Intent Engine:   http://localhost:7001/docs"
echo "  • Compliance:     http://localhost:7002/docs"
echo "  • Decision:        http://localhost:7003/docs"
echo "  • Action:          http://localhost:7004/docs"
echo "  • Frontend:        http://localhost:3000 (or check console)"
echo ""
echo "Logs:"
echo "  • Intent Engine:   tail -f /tmp/intent-engine.log"
echo "  • Compliance:     tail -f /tmp/compliance-engine.log"
echo "  • Decision:        tail -f /tmp/decision-engine.log"
echo "  • Action:          tail -f /tmp/action-engine.log"
echo "  • Frontend:        tail -f /tmp/frontend.log"
echo ""
echo "To stop all services:"
echo "  kill $INTENT_PID $COMPLIANCE_PID $DECISION_PID $ACTION_PID $FRONTEND_PID"
echo ""
echo "========================================="
