---
name: Replit lock file internal URLs
description: npm lock files generated inside Replit contain internal proxy URLs that break external CI systems like EAS Build.
---

## The rule
Any `package-lock.json` generated or modified by `npm install` inside Replit will contain resolved URLs pointing to `http://package-firewall.replit.local/npm/...` (newer environments use `http://package-firewall.replit.internal/npm/...`) instead of `https://registry.npmjs.org/...`. These internal URLs are only reachable from within Replit's network. External CI workers (EAS Build, GitHub Actions, etc.) cannot reach them, so `npm ci` silently fails to download those packages.

**Why:** Replit proxies npm downloads through its own package firewall for security scanning. This proxy URL gets written into the lock file's `"resolved"` field for every package that is installed or re-resolved inside Replit.

**How to apply:**
- After any `npm install` / `npm install --package-lock-only` run inside Replit that modifies `package-lock.json`, always run this fix before committing:
  ```js
  lock = lock.replace(/http:\/\/package-firewall\.replit\.local\/npm\//g, 'https://registry.npmjs.org/');
  ```
- Or as a shell one-liner:
  ```sh
  sed -i 's|http://package-firewall.replit.local/npm/|https://registry.npmjs.org/|g; s|http://package-firewall.replit.internal/npm/|https://registry.npmjs.org/|g' package-lock.json
  ```
- Verify with: `grep -c "package-firewall" package-lock.json` — must return 0 before committing (covers both the `.local` and `.internal` hostnames).
- This applies to the entire `package-lock.json`, not just specific entries. The count can be anywhere from a handful to hundreds depending on how many packages were re-resolved.
