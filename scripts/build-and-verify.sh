#!/bin/bash
# Production build helper; this project's Replit deployment also builds
# scripts/build-web.js with --variant production.
# All the work happens in scripts/build-web.js so the same steps run on
# Windows/macOS for the IIS production build (`npm run build:web:production`).
set -e
cd "$(dirname "$0")/.."
exec node scripts/build-web.js --variant production --no-web-config --precompress "$@"
