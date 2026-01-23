#!/bin/bash
# EAS Build hook to fix React Native Firebase non-modular header warnings
# Reference: https://github.com/invertase/react-native-firebase/issues/8657

set -e

PODFILE="ios/Podfile"

if [ ! -f "$PODFILE" ]; then
  echo "[fix-firebase-headers] Podfile not found at $PODFILE, skipping"
  exit 0
fi

echo "[fix-firebase-headers] Checking Podfile for CLANG fix..."

# Check if already patched
if grep -q "CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES" "$PODFILE"; then
  echo "[fix-firebase-headers] Podfile already contains the fix"
  exit 0
fi

echo "[fix-firebase-headers] Patching Podfile..."

# Create a temporary file with the fix
cat > /tmp/clang_fix.txt << 'EOF'

    # Fix for React Native Firebase non-modular headers (Expo SDK 54+)
    # https://github.com/invertase/react-native-firebase/issues/8657
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
    end
EOF

# Use sed to insert after "post_install do |installer|"
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS sed
  sed -i '' '/post_install do |installer|/r /tmp/clang_fix.txt' "$PODFILE"
else
  # Linux sed
  sed -i '/post_install do |installer|/r /tmp/clang_fix.txt' "$PODFILE"
fi

rm /tmp/clang_fix.txt

echo "[fix-firebase-headers] Podfile patched successfully"
echo "[fix-firebase-headers] Verifying patch..."
grep -A 10 "post_install do" "$PODFILE" | head -15
