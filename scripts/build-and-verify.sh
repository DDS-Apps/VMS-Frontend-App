#!/bin/bash
# Entry point used by the Replit deployment (.replit [deployment] build).
# Builds the QA web bundle for Replit Publishing and local web preview.
# All the work happens in scripts/build-web.js so the same steps run on
# Windows/macOS for the IIS production build (`npm run build:web:production`).
set -e
cd "$(dirname "$0")/.."
exec node scripts/build-web.js --variant qa --no-web-config --precompress "$@"
