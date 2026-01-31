#!/bin/bash
# Deploy all: frontend, email-service, video-service, ecosystem config, nginx
# Engines (7001–7007) or unified backend must already be on EC2.
# At the end, waits for backend /v1/health to report "ollama":"connected" (up to ~10 min).
#   SKIP_OLLAMA_WAIT=1 to skip wait; HEALTH_URL to override health URL.
#
# Usage:
#   ./deploy/DEPLOY_ALL.sh EC2_IP [KEY_FILE]
# Example:
#   ./deploy/DEPLOY_ALL.sh 44.202.189.78
#   ./deploy/DEPLOY_ALL.sh 44.202.189.78 /path/to/intent-platform-key.pem

set -e

EC2_IP="${1}"
KEY_FILE="${2}"
EC2_USER="${EC2_USER:-ubuntu}"
APP_DIR_ON_EC2="/home/ubuntu/app"

# Resolve project root (intent-frontend-full-working)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ -z "$EC2_IP" ]; then
  echo "❌ EC2 IP required"
  echo ""
  echo "Usage: $0 EC2_IP [KEY_FILE]"
  echo "  EC2_IP    – Public IP of your EC2 instance"
  echo "  KEY_FILE  – Path to .pem (default: intent-platform-key.pem in project root)"
  echo ""
  echo "Example: $0 44.202.189.78"
  exit 1
fi

# Resolve key file
if [ -z "$KEY_FILE" ]; then
  KEY_FILE="$PROJECT_ROOT/intent-platform-key.pem"
fi
if [ ! -f "$KEY_FILE" ]; then
  if [ -f "$SCRIPT_DIR/../intent-platform-key.pem" ]; then
    KEY_FILE="$(cd "$SCRIPT_DIR/.." && pwd)/intent-platform-key.pem"
  fi
fi
if [ ! -f "$KEY_FILE" ]; then
  echo "❌ Key file not found: $KEY_FILE"
  echo "   Use: $0 $EC2_IP /path/to/your-key.pem"
  exit 1
fi

# Use quoted -i "$KEY_FILE" so paths with spaces (e.g. "Updated Code/RealEstate Intent AI Platform") work
REMOTE="$EC2_USER@$EC2_IP"

echo "🚀 Deploy all → $REMOTE"
echo "   Project root: $PROJECT_ROOT"
echo "   Key: $KEY_FILE"
echo ""

cd "$PROJECT_ROOT"

# ---- .env.production ----
if [ ! -f ".env.production" ]; then
  echo "📝 Creating .env.production..."
  cat > .env.production << 'ENVEOF'
VITE_EMAIL_SERVICE_URL=/api/email
VITE_LIVEKIT_TOKEN_URL=/api/video/token
VITE_LIVEKIT_URL=wss://qhire-ai-interivew-xygij6p0.livekit.cloud
VITE_SPEECH_SERVICE_URL=/ws/transcribe
VITE_USE_WHISPER_BACKEND=false
VITE_USE_UNIFIED_ENGINE=false
ENVEOF
fi

# ---- 1. Build frontend ----
echo "🔨 Building frontend..."
npm run build
if [ ! -d "dist" ]; then
  echo "❌ Build failed: dist/ not found"
  exit 1
fi

# ---- 2. Package and upload frontend ----
echo "📦 Packaging frontend..."
(cd dist && tar -czf - .) > /tmp/frontend-all.tar.gz
echo "⬆️  Uploading frontend..."
scp -i "$KEY_FILE" /tmp/frontend-all.tar.gz "$REMOTE:/tmp/"

# ---- 3. Package and upload services (exclude node_modules – server runs npm install) ----
echo "📦 Packaging email-service (excluding node_modules)..."
tar -czf /tmp/deploy-email-service.tar.gz --exclude=node_modules -C "$PROJECT_ROOT" email-service
echo "⬆️  Uploading email-service..."
scp -i "$KEY_FILE" /tmp/deploy-email-service.tar.gz "$REMOTE:/tmp/"
echo "📦 Packaging video-service (excluding node_modules)..."
tar -czf /tmp/deploy-video-service.tar.gz --exclude=node_modules -C "$PROJECT_ROOT" video-service
echo "⬆️  Uploading video-service..."
scp -i "$KEY_FILE" /tmp/deploy-video-service.tar.gz "$REMOTE:/tmp/"
rm -f /tmp/deploy-email-service.tar.gz /tmp/deploy-video-service.tar.gz

# ---- 4. Upload configs ----
echo "⬆️  Uploading ecosystem and nginx config..."
scp -i "$KEY_FILE" "$SCRIPT_DIR/ecosystem-production.config.js" "$REMOTE:/tmp/ecosystem-production.config.js"
scp -i "$KEY_FILE" "$SCRIPT_DIR/nginx-production.conf" "$REMOTE:/tmp/nginx-production.conf"

# ---- 5. On EC2: unpack, install, PM2, nginx ----
echo "🔧 On EC2: unpack, install, PM2, nginx..."
ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no "$REMOTE" "bash -s" "$APP_DIR_ON_EC2" << 'REMOTE_SCRIPT'
set -e
APP="$1"
[ -z "$APP" ] && APP="/home/ubuntu/app"
sudo mkdir -p "$APP/frontend" "$APP/email-service" "$APP/video-service"
sudo chown -R ubuntu:ubuntu "$APP"

# Frontend
echo "  → Extracting frontend..."
cd "$APP/frontend" && tar -xzf /tmp/frontend-all.tar.gz && cd - > /dev/null
rm -f /tmp/frontend-all.tar.gz

# Services (tarballs exclude node_modules; we npm install on server)
echo "  → Deploying email-service..."
tar -xzf /tmp/deploy-email-service.tar.gz -C "$APP" 2>/dev/null || true
rm -f /tmp/deploy-email-service.tar.gz
if [ -d "$APP/email-service" ]; then
  (cd "$APP/email-service" && npm install --production 2>/dev/null) || true
fi

echo "  → Deploying video-service..."
tar -xzf /tmp/deploy-video-service.tar.gz -C "$APP" 2>/dev/null || true
rm -f /tmp/deploy-video-service.tar.gz
if [ -d "$APP/video-service" ]; then
  (cd "$APP/video-service" && npm install --production 2>/dev/null) || true
fi

# Ecosystem
cp /tmp/ecosystem-production.config.js "$APP/ecosystem.config.js" 2>/dev/null || true

# PM2: start or reload (must be run from $APP)
cd "$APP"
if [ -f ecosystem.config.js ]; then
  if pm2 describe intent-engine >/dev/null 2>&1; then
    echo "  → PM2 reload..."
    pm2 reload ecosystem.config.js --update-env 2>/dev/null || pm2 restart all
  else
    echo "  → PM2 start..."
    pm2 start ecosystem.config.js
  fi
  pm2 save
fi

# Nginx
if [ -f /tmp/nginx-production.conf ]; then
  sudo cp /tmp/nginx-production.conf /etc/nginx/sites-available/intent-platform
  sudo ln -sf /etc/nginx/sites-available/intent-platform /etc/nginx/sites-enabled/intent-platform 2>/dev/null || true
  sudo nginx -t && sudo systemctl reload nginx
fi

echo "  ✅ Deploy on EC2 done."
REMOTE_SCRIPT

# ---- 6. Wait for Ollama connected (backend /v1/health) ----
# Set SKIP_OLLAMA_WAIT=1 to skip. HEALTH_URL defaults to http://EC2_IP/v1/health (ensure nginx proxies /v1 to backend).
if [ "${SKIP_OLLAMA_WAIT:-0}" = "1" ]; then
  echo "(Skipping Ollama wait: SKIP_OLLAMA_WAIT=1)"
else
  HEALTH_URL="${HEALTH_URL:-http://$EC2_IP/v1/health}"
  WAIT_MAX="${WAIT_OLLAMA_SECONDS:-600}"
  WAIT_INT="${WAIT_OLLAMA_INTERVAL:-15}"
  echo ""
  echo "⏳ Waiting for Ollama connected (backend $HEALTH_URL)…"
  n=0
  while [ "$n" -lt "$WAIT_MAX" ]; do
    if resp=$(curl -sf --max-time 10 "$HEALTH_URL" 2>/dev/null); then
      if echo "$resp" | grep -q '"ollama"[[:space:]]*:[[:space:]]*"connected"'; then
        echo "✅ Ollama connected."
        break
      fi
    fi
    n=$((n + WAIT_INT))
    if [ "$n" -lt "$WAIT_MAX" ]; then
      echo "   … backend not ready (${n}s), retrying in ${WAIT_INT}s …"
      sleep "$WAIT_INT"
    fi
  done
  if [ "$n" -ge "$WAIT_MAX" ]; then
    echo "⚠️  Ollama check timed out after ${WAIT_MAX}s. Backend may still be starting or pulling the model (docker exec intent-ollama ollama pull llama3)."
  fi
fi

echo ""
echo "✅ Deploy all finished."
echo "   🌐 App URL: http://$EC2_IP"
echo "   📋 PM2:     ssh -i \"$KEY_FILE\" $REMOTE 'pm2 status'"
echo "   📋 Nginx:   ssh -i \"$KEY_FILE\" $REMOTE 'sudo nginx -t && sudo systemctl status nginx'"
