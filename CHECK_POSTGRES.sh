#!/bin/bash
# Check PostgreSQL connection and status

echo "========================================="
echo "🔍 PostgreSQL Connection Diagnostic"
echo "========================================="
echo ""

# Check if PostgreSQL is running (macOS)
echo "1️⃣ Checking if PostgreSQL is running..."
if command -v brew &> /dev/null; then
  echo "Checking Homebrew services..."
  brew services list | grep postgresql || echo "⚠️  PostgreSQL not found in Homebrew services"
fi

# Check if PostgreSQL process is running
if pgrep -x postgres > /dev/null || pgrep -f postgresql > /dev/null; then
  echo "✅ PostgreSQL process is running"
else
  echo "❌ PostgreSQL process NOT found"
  echo ""
  echo "💡 Start PostgreSQL:"
  echo "   macOS (Homebrew): brew services start postgresql@14"
  echo "   macOS (Homebrew): brew services start postgresql"
  echo "   Linux: sudo systemctl start postgresql"
fi

echo ""

# Check common ports
echo "2️⃣ Checking PostgreSQL ports..."
for port in 5432 5433; do
  if lsof -ti:$port > /dev/null 2>&1; then
    echo "✅ Port $port is in use"
    lsof -i:$port | grep LISTEN
  else
    echo "❌ Port $port is NOT in use"
  fi
done

echo ""

# Check for Docker PostgreSQL
echo "3️⃣ Checking for Docker PostgreSQL..."
if command -v docker &> /dev/null; then
  if docker ps | grep -i postgres > /dev/null; then
    echo "✅ Docker PostgreSQL container is running:"
    docker ps | grep -i postgres
  else
    echo "❌ No Docker PostgreSQL container found"
  fi
fi

echo ""

# Check connection with different methods
echo "4️⃣ Testing connection methods..."

# Method 1: Default localhost
echo "Testing: localhost:5432 (default)"
timeout 2 bash -c 'echo > /dev/tcp/localhost/5432' 2>/dev/null && echo "✅ Port is open" || echo "❌ Port is closed or unreachable"

echo ""

# Show common connection strings
echo "5️⃣ Common Connection Patterns:"
echo ""
echo "Standard PostgreSQL:"
echo "   PGHOST=localhost"
echo "   PGPORT=5432"
echo "   PGDATABASE=intent_platform"
echo "   PGUSER=postgres"
echo "   PGPASSWORD=(your password)"
echo ""

echo "Docker PostgreSQL:"
echo "   PGHOST=localhost"
echo "   PGPORT=5432"
echo "   PGDATABASE=intent_platform"
echo "   PGUSER=postgres"
echo "   PGPASSWORD=postgres"
echo ""

echo "Local socket (if PostgreSQL running locally):"
echo "   PGHOST=/tmp"
echo "   or leave PGHOST unset"
echo ""

# Check docker-compose
echo "6️⃣ Checking docker-compose.yml for PostgreSQL config..."
if [ -f "/Users/bhanukiran/Downloads/ACENTLE/UiP/uip-main/docker-compose.yml" ]; then
  echo "📄 Found docker-compose.yml"
  echo "Checking for PostgreSQL service..."
  if grep -i postgres /Users/bhanukiran/Downloads/ACENTLE/UiP/uip-main/docker-compose.yml > /dev/null; then
    echo "✅ PostgreSQL service found in docker-compose.yml"
    echo ""
    echo "💡 To start PostgreSQL with Docker Compose:"
    echo "   cd /Users/bhanukiran/Downloads/ACENTLE/UiP/uip-main"
    echo "   docker-compose up -d postgres"
  fi
fi

echo ""
echo "========================================="
echo "✅ Diagnostic Complete"
echo "========================================="
