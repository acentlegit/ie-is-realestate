#!/bin/bash
# Fix Keycloak admin console 400: add redirect URIs for admin when accessed via app (port 443).
# Run on EC2. Keycloak on 127.0.0.1:8080.

set -e
KEYCLOAK_URL="${KEYCLOAK_URL:-http://127.0.0.1:8080}"
ADMIN_USER="${ADMIN_USER:-admin}"
ADMIN_PASS="${ADMIN_PASS:-admin}"

echo "Getting admin token..."
TOKEN=$(curl -s -X POST "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=$ADMIN_USER" \
  -d "password=$ADMIN_PASS" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" \
  | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

[ -n "$TOKEN" ] || { echo "Failed to get token"; exit 1; }

echo "Listing master realm clients..."
curl -s -H "Authorization: Bearer $TOKEN" "$KEYCLOAK_URL/admin/realms/master/clients" > /tmp/kc-clients.json

# Find security-admin-console client (admin UI client)
CLIENT_ID=$(grep -o '"id":"[^"]*","clientId":"security-admin-console"' /tmp/kc-clients.json | head -1 | sed 's/.*"id":"\([^"]*\)".*/\1/')
if [ -z "$CLIENT_ID" ]; then
  # Try alternate: clientId might be in different order
  CLIENT_ID=$(curl -s -H "Authorization: Bearer $TOKEN" "$KEYCLOAK_URL/admin/realms/master/clients?clientId=security-admin-console" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
fi
if [ -z "$CLIENT_ID" ]; then
  echo "security-admin-console not found. Listing clientIds:"
  grep -o '"clientId":"[^"]*"' /tmp/kc-clients.json
  exit 1
fi

echo "Getting client $CLIENT_ID config..."
curl -s -H "Authorization: Bearer $TOKEN" "$KEYCLOAK_URL/admin/realms/master/clients/$CLIENT_ID" > /tmp/kc-client.json

# Add redirect URIs and web origins using jq if available, else python
if command -v jq >/dev/null 2>&1; then
  REDIRECTS=$(jq -c '.redirectUris + ["https://44.199.236.31/admin/master/console/*","https://44.199.236.31:8443/admin/master/console/*"] | unique' /tmp/kc-client.json)
  WEBORIGINS=$(jq -c '.webOrigins + ["https://44.199.236.31","https://44.199.236.31:8443"] | unique' /tmp/kc-client.json)
  jq --argjson r "$REDIRECTS" --argjson w "$WEBORIGINS" '.redirectUris = $r | .webOrigins = $w' /tmp/kc-client.json > /tmp/kc-client-updated.json
else
  python3 << 'PY'
import json
with open("/tmp/kc-client.json") as f:
    c = json.load(f)
c.setdefault("redirectUris", []).extend([
    "https://44.199.236.31/admin/master/console/*",
    "https://44.199.236.31:8443/admin/master/console/*"
])
c["redirectUris"] = list(dict.fromkeys(c["redirectUris"]))
c.setdefault("webOrigins", []).extend(["https://44.199.236.31", "https://44.199.236.31:8443"])
c["webOrigins"] = list(dict.fromkeys(c["webOrigins"]))
with open("/tmp/kc-client-updated.json", "w") as f:
    json.dump(c, f, indent=2)
PY
fi

echo "Updating client..."
HTTP=$(curl -s -o /tmp/kc-put.out -w "%{http_code}" -X PUT "$KEYCLOAK_URL/admin/realms/master/clients/$CLIENT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @/tmp/kc-client-updated.json)

if [ "$HTTP" = "204" ] || [ "$HTTP" = "200" ]; then
  echo "Admin console client updated. Try: https://44.199.236.31:8443/admin"
else
  echo "PUT response: $HTTP"
  cat /tmp/kc-put.out
  exit 1
fi
