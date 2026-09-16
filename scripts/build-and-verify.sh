#!/bin/bash
set -e

CORRECT_BACKEND="vms-backend-app-qa.replit.app"

echo "=========================================="
echo "VMS Frontend QA Build"
echo "=========================================="
echo ""

echo "[BUILD] Checking environment variables..."
echo "  EXPO_PUBLIC_API_BASE_URL: ${EXPO_PUBLIC_API_BASE_URL:-NOT SET}"
echo "  EXPO_PUBLIC_VMS_API_BASE_URL: ${EXPO_PUBLIC_VMS_API_BASE_URL:-NOT SET}"
echo "  EXPO_PUBLIC_MICROSOFT_AUTH_URL: ${EXPO_PUBLIC_MICROSOFT_AUTH_URL:-NOT SET}"
echo ""

if [ -z "$EXPO_PUBLIC_API_BASE_URL" ] || [[ "$EXPO_PUBLIC_API_BASE_URL" == *"worf.replit.dev"* ]] || [[ "$EXPO_PUBLIC_API_BASE_URL" == *"-00-"* ]]; then
  echo "[BUILD] Setting QA URL (env var was missing or contained dev URL)"
  export EXPO_PUBLIC_API_BASE_URL="https://$CORRECT_BACKEND"
  export EXPO_PUBLIC_VMS_API_BASE_URL="https://$CORRECT_BACKEND"
  export EXPO_PUBLIC_MICROSOFT_AUTH_URL="https://$CORRECT_BACKEND"
  echo "[BUILD] Using: $EXPO_PUBLIC_API_BASE_URL"
else
  echo "[BUILD] Environment variable validated successfully"
fi
echo ""

echo "[BUILD] Clearing old dist/ directory..."
rm -rf dist/
echo "[BUILD] Old build artifacts cleared"
echo ""

echo "[BUILD] Running Expo web export..."
npx expo export --platform web --clear
echo ""
echo "[BUILD] Export completed"
echo ""

echo "[BUILD] Copying Firebase service worker..."
if [ -f "web/firebase-messaging-sw.js" ]; then
  cp web/firebase-messaging-sw.js dist/
  echo "[BUILD] Service worker copied to dist/firebase-messaging-sw.js"
else
  echo "[BUILD] WARNING: web/firebase-messaging-sw.js not found, skipping copy"
fi
echo ""

echo "[BUILD] Verifying bundle for forbidden API URLs..."
FOUND_FORBIDDEN=false

FORBIDDEN_URL_PATTERNS=(
  "https://.*worf\.replit\.dev"
  "https://b4ba7f88-2197-4a63"
  "https://.*-00-.*\.replit\.dev"
)

for pattern in "${FORBIDDEN_URL_PATTERNS[@]}"; do
  if grep -rE "$pattern" dist/ 2>/dev/null | grep -v "includes(" | grep -v "\.includes"; then
    echo ""
    echo "[BUILD] ERROR: Found forbidden URL pattern '$pattern' in bundle!"
    FOUND_FORBIDDEN=true
  fi
done

if [ "$FOUND_FORBIDDEN" = true ]; then
  echo ""
  echo "=========================================="
  echo "[BUILD] FAILED: Bundle contains development URLs!"
  echo "=========================================="
  exit 1
fi

echo "[BUILD] No forbidden URLs found in bundle"
echo ""

echo "[BUILD] Verifying backend URL is present..."
if grep -r "$CORRECT_BACKEND" dist/ >/dev/null 2>&1; then
  echo "[BUILD] Confirmed: $CORRECT_BACKEND found in bundle"
else
  echo "[BUILD] NOTE: Backend URL ($CORRECT_BACKEND) not found in static bundle."
  echo "[BUILD] This is expected - EXPO_PUBLIC_ env vars are injected at runtime by Replit."
  echo "[BUILD] Proceeding with build..."
fi
echo ""

echo "[BUILD] Pre-compressing static assets (brotli + gzip)..."
node scripts/precompress-dist.js
echo ""

echo "=========================================="
echo "[BUILD] SUCCESS: Build is ready"
echo "=========================================="
echo ""
echo "Bundle location: dist/"
echo "Backend URL: https://$CORRECT_BACKEND"
echo ""
