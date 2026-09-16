#!/bin/bash
# Entry point used by the Replit deployment (.replit [deployment] build).
# Always builds the production web bundle for Replit Publishing. Production
# values come from the committed environment map; inherited QA EXPO_PUBLIC_*
# variables are ignored by the production resolver.
# All the work happens in scripts/build-web.js so the same steps run on
# Windows/macOS for the IIS production build (`npm run build:web:production`).
set -e
cd "$(dirname "$0")/.."
exec node scripts/build-web.js --variant production --no-web-config --precompress "$@"
