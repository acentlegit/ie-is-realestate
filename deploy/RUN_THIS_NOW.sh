#!/bin/bash
# ONE-LINER TO FIX ALL 405 ERRORS
# Copy-paste this entire block into your terminal

echo "🚀 Uploading and running Nginx fix..."
scp -i intent-platform-key.pem \
  deploy/nginx-fix.sh \
  ubuntu@44.202.189.78:/home/ubuntu/ && \
ssh -i intent-platform-key.pem ubuntu@44.202.189.78 \
  "chmod +x nginx-fix.sh && ./nginx-fix.sh"

echo ""
echo "✅ Done! Refresh your browser - 405 errors should be gone!"
