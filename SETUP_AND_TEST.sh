#!/bin/bash
# Phase 12 - Complete Setup & Test Script
# Handles all setup steps and testing

set -e

echo "========================================="
echo "🧪 Phase 12 - Complete Setup & Testing"
echo "========================================="
echo ""

ROOT_DIR="/Users/bhanukiran/Downloads/ACENTLE/UiP/uip-main"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Step 1: Kill existing processes
echo -e "${BLUE}Step 1: Cleaning up ports...${NC}"
for port in 7007 7001 7002; do
  if lsof -ti:$port > /dev/null 2>&1; then
    echo -e "${YELLOW}Killing process on port $port...${NC}"
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
done
sleep 2
echo -e "${GREEN}✅ Ports cleaned${NC}"
echo ""

# Step 2: Create Evidence Table
echo -e "${BLUE}Step 2: Creating Evidence Table...${NC}"
echo "Choose method:"
echo "  1. Using psql (if available)"
echo "  2. Using Node.js script (if pg package available)"
echo "  3. Manual (copy SQL file to your PostgreSQL client)"
echo ""

# Check if psql is available
if command -v psql &> /dev/null; then
  echo -e "${GREEN}✅ psql found${NC}"
  echo "Creating table with psql..."
  psql -U postgres -d intent_platform -f "$ROOT_DIR/db/postgres/migrations/002_evidence.sql" 2>/dev/null && \
    echo -e "${GREEN}✅ Evidence table created${NC}" || \
    echo -e "${YELLOW}⚠️  Table might already exist or connection failed${NC}"
else
  echo -e "${YELLOW}⚠️  psql not found${NC}"
  echo ""
  echo "Option 1: Install PostgreSQL client tools"
  echo "  macOS: brew install postgresql"
  echo "  Linux: sudo apt-get install postgresql-client"
  echo ""
  echo "Option 2: Use Node.js script"
  if command -v node &> /dev/null; then
    echo -e "${GREEN}✅ Node.js found${NC}"
    echo "Installing pg package if needed..."
    cd "$ROOT_DIR/services/evidence-engine"
    npm install pg 2>/dev/null || echo "pg package might need to be installed"
    echo ""
    echo "To create table with Node.js, run:"
    echo "  node CREATE_EVIDENCE_TABLE.js"
    echo "(Make sure to set PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD env vars)"
  else
    echo -e "${RED}❌ Node.js not found${NC}"
  fi
  echo ""
  echo "Option 3: Manual SQL"
  echo "  Copy SQL from: CREATE_EVIDENCE_TABLE.sql"
  echo "  Run in your PostgreSQL client (pgAdmin, DBeaver, etc.)"
  echo ""
  read -p "Press Enter to continue (table will be created when Evidence Engine first tries to use it)..."
fi
echo ""

# Step 3: Check if services need to be started
echo -e "${BLUE}Step 3: Checking services...${NC}"
SERVICES_NEEDED=()

check_service() {
  local port=$1
  local name=$2
  
  if curl -s "http://localhost:$port/v1/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ $name is running (port $port)${NC}"
    return 0
  else
    echo -e "${RED}❌ $name is NOT running (port $port)${NC}"
    SERVICES_NEEDED+=("$name:$port")
    return 1
  fi
}

check_service 7007 "Evidence Engine"
check_service 7001 "Intent Engine"
check_service 7002 "Compliance Engine"
echo ""

# Step 4: Instructions for starting services
if [ ${#SERVICES_NEEDED[@]} -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Some services need to be started${NC}"
  echo ""
  echo "Start services in separate terminals:"
  echo ""
  
  for service in "${SERVICES_NEEDED[@]}"; do
    name=$(echo $service | cut -d: -f1)
    port=$(echo $service | cut -d: -f2)
    
    if [ "$name" = "Evidence Engine" ]; then
      echo -e "${BLUE}Terminal for $name (port $port):${NC}"
      echo "  cd $ROOT_DIR/services/evidence-engine"
      echo "  npm install && npm run build && PORT=$port npm start"
    elif [ "$name" = "Intent Engine" ]; then
      echo -e "${BLUE}Terminal for $name (port $port):${NC}"
      echo "  cd $ROOT_DIR/services/intent-engine"
      echo "  npm install && npm run build && PORT=$port npm start"
    elif [ "$name" = "Compliance Engine" ]; then
      echo -e "${BLUE}Terminal for $name (port $port):${NC}"
      echo "  cd $ROOT_DIR/services/compliance-engine"
      echo "  npm install && npm run build && PORT=$port npm start"
    fi
    echo ""
  done
  
  echo "Wait for all services to show 'listening on' messages"
  echo ""
  read -p "Press Enter after all services are started..."
  echo ""
fi

# Step 5: Run automated tests
echo -e "${BLUE}Step 4: Running automated tests...${NC}"
if [ -f "./QUICK_TEST_PHASE12.sh" ]; then
  ./QUICK_TEST_PHASE12.sh
else
  echo -e "${RED}❌ Test script not found${NC}"
  echo "Run tests manually: ./QUICK_TEST_PHASE12.sh"
fi

echo ""
echo "========================================="
echo -e "${GREEN}✅ Setup & Testing Complete!${NC}"
echo "========================================="
echo ""
echo "Next: Test UI in browser"
echo "  1. Start Frontend: npm run dev"
echo "  2. Open: http://localhost:5173"
echo "  3. Enter intent and analyze"
echo "  4. Expand '6️⃣ Audit Trail' section"
echo ""
