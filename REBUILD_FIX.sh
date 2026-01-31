#!/bin/bash
# Final Rebuild Script - Fixes CORS by using relative paths in production

set -e

echo "🔧 Final Frontend Rebuild - CORS Fix"
echo "===================================="
echo ""

FRONTEND_DIR="/Users/bhanukiran/Downloads/ACENTLE/UiP/URIP/Updated Code/RealEstate Intent AI Platform/intent-frontend-full-working"
cd "$FRONTEND_DIR"

# Step 1: Verify API code is fixed
echo "✅ Step 1: Verifying API code fix..."
if grep -q "isProduction.*production" src/api/intentApi.js; then
    echo "   ✅ API code has production mode detection"
else
    echo "   ❌ API code not fixed! Check src/api/intentApi.js"
    exit 1
fi

# Step 2: Clean old build
echo ""
echo "🧹 Step 2: Cleaning old build..."
rm -rf dist
echo "   ✅ Old build removed"

# Step 3: Build in PRODUCTION mode
echo ""
echo "🔨 Step 3: Building in PRODUCTION mode..."
npm run build -- --mode production

if [ ! -d "dist" ]; then
    echo "   ❌ Build failed - dist directory not created"
    exit 1
fi
echo "   ✅ Build completed"

# Step 4: Sanity check - verify NO localhost URLs
echo ""
echo "🔍 Step 4: Verifying build (checking for localhost URLs)..."
if grep -r "localhost:7001" dist/ 2>/dev/null || \
   grep -r "localhost:7002" dist/ 2>/dev/null || \
   grep -r "localhost:7003" dist/ 2>/dev/null; then
    echo "   ❌ BUILD STILL CONTAINS LOCALHOST URLs!"
    echo "   Check the build output above"
    exit 1
else
    echo "   ✅ Build is clean - no localhost URLs found"
fi

# Check for relative paths
if grep -r "/api/intent" dist/ 2>/dev/null; then
    echo "   ✅ Build contains relative paths (/api/...)"
else
    echo "   ⚠️  Warning: No /api/ paths found in build"
fi

echo ""
echo "✅ Build verification complete!"
echo ""
echo "📤 Next steps:"
echo "   1. Upload to EC2:"
echo "      scp -i intent-platform-key.pem -r dist/* ubuntu@44.202.189.78:/home/ubuntu/app/frontend/"
echo ""
echo "   2. Reload Nginx on EC2:"
echo "      ssh -i intent-platform-key.pem ubuntu@44.202.189.78"
echo "      sudo systemctl reload nginx"
echo ""
echo "   3. Hard refresh browser (Cmd+Shift+R or Incognito)"
echo ""
echo "🎯 Expected result:"
echo "   - Network requests show /api/intent, /api/decision, etc."
echo "   - NO localhost:7001, localhost:7003 in requests"
echo "   - NO CORS errors"
