#!/bin/bash
# Run this on EC2 to create Keycloak realm "intent-platform" via Admin API.
# Keycloak must be running on 127.0.0.1:8080 (or set KEYCLOAK_URL).

set -e
KEYCLOAK_URL="${KEYCLOAK_URL:-http://127.0.0.1:8080}"
ADMIN_USER="${ADMIN_USER:-admin}"
ADMIN_PASS="${ADMIN_PASS:-admin}"

echo "Getting admin token from $KEYCLOAK_URL..."
TOKEN=$(curl -s -X POST "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=$ADMIN_USER" \
  -d "password=$ADMIN_PASS" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" \
  | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "Failed to get token. Check Keycloak is running and admin credentials."
  exit 1
fi

echo "Creating realm intent-platform..."
HTTP=$(curl -s -o /tmp/keycloak-realm.out -w "%{http_code}" -X POST "$KEYCLOAK_URL/admin/realms" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"realm":"intent-platform","enabled":true,"displayName":"Intent Platform"}')

if [ "$HTTP" = "201" ]; then
  echo "Realm intent-platform created successfully."
else
  echo "Response: $HTTP"
  cat /tmp/keycloak-realm.out
  if [ "$HTTP" = "409" ]; then
    echo "Realm already exists."
  else
    exit 1
  fi
fi

echo "Done. Create client 'intent-frontend' in Keycloak admin UI:"
echo "  https://44.199.236.31:8443/admin -> realm intent-platform -> Clients -> Create client"
