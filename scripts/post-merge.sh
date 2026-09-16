#!/bin/bash
set -e

echo "=== Post-merge setup ==="

# 1. Install dependencies
echo "Installing dependencies..."
npm install --legacy-peer-deps

# 2. Duplicate import guard
# Task-agent merges can introduce a second 'import { ... } from "same/path"' line
# when the agent's branch and main both touched the same file's imports.
# Only value imports (lines starting with 'import {' or 'import *') are checked;
# 'import type', 'export { } from', and module names in comments are ignored.
echo "Checking for duplicate import paths..."
FOUND_DUPES=0
while IFS= read -r -d '' file; do
  # Grep only actual value-import lines (not 'import type ...')
  dupes=$(grep -P "^import\s+(?!type[\s{])" "$file" 2>/dev/null \
    | grep -oP "from ['\"]\\K[^'\"]+(?=['\"])" \
    | sort | uniq -d)
  if [ -n "$dupes" ]; then
    echo "  ERROR: duplicate import(s) in $file:"
    echo "$dupes" | while read -r d; do echo "    - $d"; done
    FOUND_DUPES=1
  fi
done < <(find screens components hooks utils constants -name "*.tsx" -print0 -o -name "*.ts" -print0 2>/dev/null)

if [ "$FOUND_DUPES" -eq 1 ]; then
  echo ""
  echo "Fix duplicate imports before merging. Merge cannot proceed."
  exit 1
fi
echo "  Duplicate import check passed."

echo "=== Post-merge setup complete ==="
