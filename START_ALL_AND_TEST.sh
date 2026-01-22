#!/bin/bash
# Complete startup and test script for Phase 12
# This script guides you through starting everything

echo "========================================="
echo "🚀 Phase 12 - Complete Startup & Test"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "This script will guide you through:"
echo "  1. Starting PostgreSQL"
echo "  2. Creating Evidence Table"
echo "  3. Starting Engines (3 terminals needed)"
echo "  4. Running Tests"
echo ""

read -p "Press Enter to continue..."
echo ""

# Step 1: Check PostgreSQL
echo "========================================="
echo "Step 1: PostgreSQL Setup"
echo "========================================="
echo ""

if timeout 2 bash -c 'echo > /dev/tcp/localhost/5432' 2>/dev/null; then
  echo -e "${GREEN}✅ PostgreSQL is running${NC}"
else
  echo -e "${RED}❌ PostgreSQL is NOT running${NC}"
  echo ""
  echo "Starting PostgreSQL..."
  ./START_POSTGRES.sh
  echo ""
  read -p "Press Enter after PostgreSQL is running..."
fi

echo ""

# Step 2: Create Database & Table
echo "========================================="
echo "Step 2: Create Database & Evidence Table"
echo "========================================="
echo ""

read -p "Have you created the intent_platform database and evidence table? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Creating database and table..."
  export PGHOST=localhost
  export PGPORT=5432
  export PGDATABASE=postgres
  export PGUSER=postgres
  export PGPASSWORD=postgres
  
  ./CREATE_DATABASE_AND_TABLE.sh
  
  echo ""
  read -p "Press Enter to continue..."
fi

echo ""

# Step 3: Check if engines are running
echo "========================================="
echo "Step 3: Check Engines"
echo "========================================="
echo ""

check_engine() {
  local port=$1
  local name=$2
  if curl -s "http://localhost:$port/v1/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ $name is running (port $port)${NC}"
    return 0
  else
    echo -e "${RED}❌ $name is NOT running (port $port)${NC}"
    return 1
  fi
}

EVIDENCE_OK=0
INTENT_OK=0
COMPLIANCE_OK=0

check_engine 7007 "Evidence Engine"
EVIDENCE_OK=$?

check_engine 7001 "Intent Engine"
INTENT_OK=$?

check_engine 7002 "Compliance Engine"
COMPLIANCE_OK=$?

echo ""

if [ $EVIDENCE_OK -ne 0 ] || [ $INTENT_OK -ne 0 ] || [ $COMPLIANCE_OK -ne 0 ]; then
  echo "========================================="
  echo "Start Missing Engines"
  echo "========================================="
  echo ""
  echo "You need to start engines in separate terminals:"
  echo ""
  
  if [ $EVIDENCE_OK -ne 0 ]; then
    echo -e "${YELLOW}Terminal 1 - Evidence Engine:${NC}"
    echo "  cd /Users/bhanukiran/Downloads/ACENTLE/UiP/uip-main/services/evidence-engine"
    echo "  npm install && npm run build && PORT=7007 npm start"
    echo ""
  fi
  
  if [ $INTENT_OK -ne 0 ]; then
    echo -e "${YELLOW}Terminal 2 - Intent Engine:${NC}"
    echo "  cd /Users/bhanukiran/Downloads/ACENTLE/UiP/uip-main/services/intent-engine"
    echo "  npm install && npm run build && PORT=7001 npm start"
    echo ""
  fi
  
  if [ $COMPLIANCE_OK -ne 0 ]; then
    echo -e "${YELLOW}Terminal 3 - Compliance Engine:${NC}"
    echo "  cd /Users/bhanukiran/Downloads/ACENTLE/UiP/uip-main/services/compliance-engine"
    echo "  npm install && npm run build && PORT=7002 npm start"
    echo ""
  fi
  
  echo "Wait for all engines to show 'listening on' messages"
  echo ""
  read -p "Press Enter after all engines are started..."
  
  # Verify again
  echo ""
  echo "Verifying engines..."
  check_engine 7007 "Evidence Engine"
  EVIDENCE_OK=$?
  
  check_engine 7001 "Intent Engine"
  INTENT_OK=$?
  
  check_engine 7002 "Compliance Engine"
  COMPLIANCE_OK=$?
  
  echo ""
  
  if [ $EVIDENCE_OK -ne 0 ] || [ $INTENT_OK -ne 0 ] || [ $COMPLIANCE_OK -ne 0 ]; then
    echo -e "${RED}❌ Some engines are still not running${NC}"
    echo "Please start the missing engines and try again"
    exit 1
  fi
fi

echo "========================================="
echo "Step 4: Run Tests"
echo "========================================="
echo ""

echo -e "${GREEN}✅ All engines are running!${NC}"
echo ""
read -p "Press Enter to run tests..."

./QUICK_TEST_PHASE12.sh

echo ""
echo "========================================="
echo "✅ Complete!"
echo "========================================="
