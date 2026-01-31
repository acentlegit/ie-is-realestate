#!/bin/sh
# Resolve backend hostname to IP at container start so nginx does not resolve at config load
# (avoids "host not found in upstream" when backend DNS is not ready yet)
set -e
CONF="/etc/nginx/conf.d/default.conf"
BACKEND_HOST="${BACKEND_HOST:-backend}"
BACKEND_PORT="${BACKEND_PORT:-8000}"

# Wait for backend to be resolvable (Docker DNS may not be ready immediately)
for i in 1 2 3 4 5 6 7 8 9 10; do
  BACKEND_IP=$(ping -c 1 -W 2 "$BACKEND_HOST" 2>/dev/null | sed -n 's/.*(\([0-9.]*\)).*/\1/p')
  [ -n "$BACKEND_IP" ] && break
  sleep 2
done

if [ -z "$BACKEND_IP" ]; then
  echo "warn: could not resolve $BACKEND_HOST, using hostname (nginx may fail)" >&2
  BACKEND_IP="$BACKEND_HOST"
fi

# Replace placeholder in config (no hostname in config = no resolution at nginx parse time)
sed -i "s/__BACKEND_IP__/$BACKEND_IP/g" "$CONF"
sed -i "s/__BACKEND_PORT__/$BACKEND_PORT/g" "$CONF"

nginx -t && exec nginx -g "daemon off;"
