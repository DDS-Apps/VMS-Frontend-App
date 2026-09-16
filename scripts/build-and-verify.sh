#!/bin/bash
# Entry point used by the Replit deployment (.replit [deployment] build).
# Always builds the QA web bundle (a stray APP_VARIANT in the shared env must
# not turn the Replit deployment into a production build); extra arguments are
# passed through, so `--variant production` still wins when given explicitly.
# All the work happens in scripts/build-web.js so the same steps run on
# Windows/macOS for the IIS production build (`npm run build:web:production`).
set -e
cd "$(dirname "$0")/.."
exec node scripts/build-web.js --variant qa "$@"
