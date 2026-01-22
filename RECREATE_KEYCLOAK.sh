#!/bin/bash

echo "========================================="
echo "🔐 Recreating Keycloak Container"
echo "========================================="
echo ""

# Remove old container if it exists
echo "Removing old Keycloak container (if exists)..."
docker rm -f keycloak 2>/dev/null || echo "No existing container to remove"

# Create new Keycloak container
echo ""
echo "Creating new Keycloak container..."
docker run -d \
  --name keycloak \
  -p 8080:8080 \
  -e KEYCLOAK_ADMIN=admin \
  -e KEYCLOAK_ADMIN_PASSWORD=admin \
  quay.io/keycloak/keycloak:latest \
  start-dev

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Keycloak container created successfully!"
  echo ""
  echo "Waiting for Keycloak to start (this may take 30-60 seconds)..."
  echo "   (First time download: ~500MB image)"
  
  # Wait and check
  sleep 10
  for i in {1..6}; do
    if curl -s http://localhost:8080/health > /dev/null 2>&1; then
      echo ""
      echo "✅ Keycloak is now running!"
      echo ""
      echo "Next steps:"
      echo "1. Open: http://localhost:8080"
      echo "2. Click 'Administration Console'"
      echo "3. Login: admin / admin"
      echo "4. Create realm: intent-platform"
      echo "5. Create client: intent-frontend"
      echo ""
      echo "See KEYCLOAK_SETUP_COMPLETE.md for detailed instructions"
      exit 0
    fi
    echo "   Waiting... ($i/6)"
    sleep 10
  done
  
  echo ""
  echo "⚠️  Keycloak is starting but not ready yet"
  echo "   Check status: docker ps | grep keycloak"
  echo "   Check logs: docker logs keycloak"
  echo "   Wait a bit longer, then open: http://localhost:8080"
else
  echo ""
  echo "❌ Failed to create Keycloak container"
  echo "   Make sure Docker Desktop is running"
  exit 1
fi
