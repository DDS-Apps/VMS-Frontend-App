#!/bin/bash
# Build and Verify Script for Production Web Bundle
# This script ensures the production bundle uses the correct backend URL

set -e  # Exit on any error

CORRECT_BACKEND="vms-backend-folio3.replit.app"

echo "=========================================="
echo "VMS Frontend Production Build"
echo "=========================================="
echo ""

# Step 1: Log environment variables
echo "[BUILD] Checking environment variables..."
echo "  EXPO_PUBLIC_VMS_API_BASE_URL: ${EXPO_PUBLIC_VMS_API_BASE_URL:-NOT SET}"
echo "  EXPO_PUBLIC_MICROSOFT_AUTH_URL: ${EXPO_PUBLIC_MICROSOFT_AUTH_URL:-NOT SET}"
echo ""

# Step 2: Validate environment variables
if [ -z "$EXPO_PUBLIC_VMS_API_BASE_URL" ]; then
  echo "[BUILD] WARNING: EXPO_PUBLIC_VMS_API_BASE_URL not set, will use hardcoded fallback"
else
  if [[ "$EXPO_PUBLIC_VMS_API_BASE_URL" != *"$CORRECT_BACKEND"* ]]; then
    echo "[BUILD] ERROR: EXPO_PUBLIC_VMS_API_BASE_URL does not contain expected backend!"
    echo "  Expected to contain: $CORRECT_BACKEND"
    echo "  Got: $EXPO_PUBLIC_VMS_API_BASE_URL"
    exit 1
  fi
  echo "[BUILD] Environment variable validated successfully"
fi
echo ""

# Step 3: Clear old build artifacts
echo "[BUILD] Clearing old dist/ directory..."
rm -rf dist/
echo "[BUILD] Old build artifacts cleared"
echo ""

# Step 4: Clear Metro cache and run export
echo "[BUILD] Running Expo web export..."
npx expo export --platform web --clear
echo ""
echo "[BUILD] Export completed"
echo ""

# Step 5: Verify the bundle does not contain forbidden URLs (actual URL patterns, not string literals for validation)
echo "[BUILD] Verifying bundle for forbidden API URLs..."
FOUND_FORBIDDEN=false

# Check for actual URL patterns that would indicate wrong backend is being called
# These patterns match actual URLs, not validation string literals
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

# Also check if any actual backend URL other than the correct one is embedded in manifest
echo "[BUILD] Checking manifest for correct backend URL..."
if grep -r "apiBaseUrl" dist/ 2>/dev/null | grep -v "$CORRECT_BACKEND" | grep -v "includes(" | grep -v "\.includes"; then
  echo "[BUILD] ERROR: Found incorrect apiBaseUrl in manifest!"
  FOUND_FORBIDDEN=true
fi

if [ "$FOUND_FORBIDDEN" = true ]; then
  echo ""
  echo "=========================================="
  echo "[BUILD] FAILED: Bundle contains development URLs!"
  echo "=========================================="
  echo ""
  echo "The production bundle still references development backend URLs."
  echo "This must be fixed before deploying."
  echo ""
  exit 1
fi

echo "[BUILD] No forbidden URLs found in bundle"
echo ""

# Step 6: Verify correct URL is present in manifest
echo "[BUILD] Verifying correct backend URL is present..."
MANIFEST_CHECK=$(grep -r "apiBaseUrl.*$CORRECT_BACKEND" dist/ 2>/dev/null || echo "")
if [ -n "$MANIFEST_CHECK" ]; then
  echo "[BUILD] Confirmed: $CORRECT_BACKEND found in bundle manifest"
else
  echo "[BUILD] WARNING: Expected backend URL not clearly found in manifest"
  echo "  Checking if URL exists anywhere in bundle..."
  if grep -r "$CORRECT_BACKEND" dist/ >/dev/null 2>&1; then
    echo "[BUILD] OK: $CORRECT_BACKEND found in bundle"
  else
    echo "[BUILD] ERROR: Expected backend URL not found anywhere in bundle!"
    exit 1
  fi
fi
echo ""

echo "=========================================="
echo "[BUILD] SUCCESS: Production bundle is ready"
echo "=========================================="
echo ""
echo "Bundle location: dist/"
echo "Backend URL: https://$CORRECT_BACKEND"
echo ""
