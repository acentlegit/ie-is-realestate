#!/bin/bash
# Start PostgreSQL (Docker Compose or Local)

echo "========================================="
echo "🚀 Starting PostgreSQL"
echo "========================================="
echo ""

# Check if Docker is available
if command -v docker &> /dev/null; then
  echo "✅ Docker found"
  
  # Check for backend docker-compose.yml (has PostgreSQL)
  BACKEND_COMPOSE="/Users/bhanukiran/Downloads/ACENTLE/UiP/URIP/Updated Code/RealEstate Intent AI Platform/intent-platform-github-monorepo/backend/docker-compose.yml"
  
  if [ -f "$BACKEND_COMPOSE" ]; then
    echo "📄 Found docker-compose.yml in backend directory"
    echo ""
    echo "Starting PostgreSQL with Docker Compose..."
    cd "$(dirname "$BACKEND_COMPOSE")" || exit 1
    docker-compose up -d postgres
    
    echo ""
    echo "⏳ Waiting for PostgreSQL to be ready..."
    sleep 5
    
    # Check if it's running
    if docker ps | grep -i postgres > /dev/null; then
      echo "✅ PostgreSQL is running in Docker"
      echo ""
      echo "Connection details:"
      echo "  PGHOST=localhost"
      echo "  PGPORT=5432"
      echo "  PGDATABASE=postgres"
      echo "  PGUSER=postgres"
      echo "  PGPASSWORD=postgres"
      echo ""
      echo "💡 Note: Database name might be 'postgres' instead of 'intent_platform'"
      echo "   You may need to create 'intent_platform' database first"
      echo ""
      echo "Next: Create intent_platform database and evidence table"
    else
      echo "❌ PostgreSQL failed to start"
      echo "Check logs: docker-compose logs postgres"
    fi
  else
    echo "⚠️  docker-compose.yml not found in backend directory"
    echo ""
    echo "Trying to start PostgreSQL with Docker directly..."
    docker run -d \
      --name intent-postgres \
      -e POSTGRES_USER=postgres \
      -e POSTGRES_PASSWORD=postgres \
      -e POSTGRES_DB=intent_platform \
      -p 5432:5432 \
      postgres:15-alpine 2>/dev/null
    
    if [ $? -eq 0 ]; then
      echo "✅ PostgreSQL container started"
      echo "Connection details:"
      echo "  PGHOST=localhost"
      echo "  PGPORT=5432"
      echo "  PGDATABASE=intent_platform"
      echo "  PGUSER=postgres"
      echo "  PGPASSWORD=postgres"
    else
      echo "❌ Failed to start PostgreSQL container"
      echo "It might already be running. Check: docker ps | grep postgres"
    fi
  fi
  
elif command -v brew &> /dev/null; then
  echo "✅ Homebrew found"
  echo "Starting PostgreSQL with Homebrew..."
  
  brew services start postgresql@14 || brew services start postgresql
  
  sleep 3
  
  if pgrep -x postgres > /dev/null; then
    echo "✅ PostgreSQL started"
    echo ""
    echo "Connection details:"
    echo "  PGHOST=localhost"
    echo "  PGPORT=5432"
    echo "  PGDATABASE=intent_platform"
    echo "  PGUSER=$(whoami)"
    echo "  PGPASSWORD="
    echo ""
    echo "💡 You may need to create 'intent_platform' database:"
    echo "   createdb intent_platform"
  else
    echo "❌ PostgreSQL failed to start"
    echo "Check: brew services list"
  fi
  
else
  echo "❌ Neither Docker nor Homebrew found"
  echo ""
  echo "Please start PostgreSQL manually:"
  echo "  - Docker: docker run ... (see above)"
  echo "  - Homebrew: brew services start postgresql"
  echo "  - System: sudo systemctl start postgresql"
fi

echo ""
echo "========================================="
