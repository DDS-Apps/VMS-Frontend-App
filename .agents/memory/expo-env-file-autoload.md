---
name: Expo .env.production auto-load and environment resolution
description: Why per-variant config is resolved explicitly in app.config.js instead of trusting process.env, and how production builds stay isolated from the QA shared env.
---
**Rule:** Production remains the default base environment and native backend, including internal/preview binaries. QA must be explicitly selected, never inferred from a missing or unknown variant. Resolve native URLs through the shared environment resolver, ignore process URL overrides in production, enforce the canonical HTTPS production hosts and prefer `Constants.expoConfig.extra.*` at runtime.

**All-configuration policy (2026-10-15):** The user explicitly superseded the web-only QA exception and requested `https://vms.dallah.com` for every configuration, including IIS web and mobile. Explicit QA/staging variants must not restore the old QA backend. This is the requested policy, not evidence that every setting has already been updated.

**Why:** The user now wants all clients to target production. Changing a shared API variable alone does not affect exported web when build-time resolution overrides it.

**How to apply:** Align web-specific overrides and all client variants with production without changing Firebase. Distinguish the public client origin from IIS's real backend upstream to avoid self-proxy loops. Exported browser configuration requires rebuilding; publishing needs separate authorization.

**Why:** The user explicitly stated all builds and publishing should target production. Expo also loads `.env.production` for every export regardless of variant, and Metro inlines `EXPO_PUBLIC_*` references. Stale QA process variables or a plaintext production URL must not override that requirement.

**How to apply:** New per-environment values go into `config/app-environments.js` (+ `publicEnvFor`, + `extra` in `app.config.js`); production web builds go through `scripts/build-web.js`, which also verifies the inlined `apiBaseUrl` matches the variant. Bundle scans must not use `grep -v` on minified output — one filtered line hides the whole bundle; scan token-by-token with context instead.

Production clients running outside their canonical web domain require backend approval for those exact origins.

**Why:** The production API's CORS response can reject a Replit/local preview even when the build correctly targets production. Static exports and a rendered login page do not prove authenticated API access.

**How to apply:** Verify allowed origins separately, keep production targeting unchanged, and never suggest wildcard credentialed CORS as a workaround.
