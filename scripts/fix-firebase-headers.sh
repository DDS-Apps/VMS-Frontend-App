#!/bin/bash
# EAS Build hook to fix React Native Firebase non-modular header warnings
# This script patches the Podfile after expo prebuild but before pod install

PODFILE="ios/Podfile"

if [ ! -f "$PODFILE" ]; then
  echo "[fix-firebase-headers] Podfile not found at $PODFILE, skipping"
  exit 0
fi

echo "[fix-firebase-headers] Patching Podfile..."

# Check if already patched
if grep -q "CLANG_WARN_NON_MODULAR_INCLUDE_IN_FRAMEWORK_MODULE" "$PODFILE"; then
  echo "[fix-firebase-headers] Podfile already patched"
  exit 0
fi

# Add $RNFirebaseAsStaticFramework = true at the beginning if not present
if ! grep -q '$RNFirebaseAsStaticFramework' "$PODFILE"; then
  sed -i.bak '1s/^/$RNFirebaseAsStaticFramework = true\n\n/' "$PODFILE"
  echo "[fix-firebase-headers] Added \$RNFirebaseAsStaticFramework = true"
fi

# Create the post_install patch
PATCH='
    # Fix React Native Firebase non-modular header warnings
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        if target.name.start_with?("RNFB") || target.name.include?("Firebase") || target.name.include?("GoogleUtilities")
          config.build_settings["CLANG_WARN_NON_MODULAR_INCLUDE_IN_FRAMEWORK_MODULE"] = "NO"
        end
        config.build_settings["CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES"] = "YES"
      end
    end
'

# Insert patch after "post_install do |installer|"
# Using awk for reliable multi-line insertion
awk -v patch="$PATCH" '
/post_install do \|installer\|/ {
  print $0
  print patch
  next
}
{print}
' "$PODFILE" > "$PODFILE.tmp" && mv "$PODFILE.tmp" "$PODFILE"

echo "[fix-firebase-headers] Podfile patched successfully"
cat "$PODFILE" | head -50
