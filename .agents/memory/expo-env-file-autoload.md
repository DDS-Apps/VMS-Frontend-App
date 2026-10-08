---
name: Expo .env.production auto-load and environment resolution
description: Why per-variant config is resolved explicitly in app.config.js instead of trusting process.env, and how production builds stay isolated from the QA shared env.
---
**Rule:** Production remains the default base environment and native backend, including internal/preview binaries. QA must be explicitly selected, never inferred from a missing or unknown variant. Resolve native URLs through the shared environment resolver, ignore process URL overrides in production, enforce the canonical HTTPS production hosts and prefer `Constants.expoConfig.extra.*` at runtime.

**Web exception (2026-10-08):** The user explicitly requested the QA backend at `https://vms-backend-app-qa.replit.app/` for web only, superseding the earlier all-platform production requirement. Web API and Microsoft authentication should use the same QA backend; do not switch native backends, Firebase, or app domains along with it.

**Why:** Changing the shared API secret did not affect published web because production resolution intentionally ignores it. Keep the web exception explicit and isolated rather than weakening native production guards.

**How to apply:** Preserve web-only backend selection and republish when its embedded public configuration changes. Shared API secrets are not live runtime configuration for an exported browser bundle.

**Why:** The user explicitly stated all builds and publishing should target production. Expo also loads `.env.production` for every export regardless of variant, and Metro inlines `EXPO_PUBLIC_*` references. Stale QA process variables or a plaintext production URL must not override that requirement.

**How to apply:** New per-environment values go into `config/app-environments.js` (+ `publicEnvFor`, + `extra` in `app.config.js`); production web builds go through `scripts/build-web.js`, which also verifies the inlined `apiBaseUrl` matches the variant. Bundle scans must not use `grep -v` on minified output — one filtered line hides the whole bundle; scan token-by-token with context instead.

Production clients running outside their canonical web domain require backend approval for those exact origins.

**Why:** The production API's CORS response can reject a Replit/local preview even when the build correctly targets production. Static exports and a rendered login page do not prove authenticated API access.

**How to apply:** Verify allowed origins separately, keep production targeting unchanged, and never suggest wildcard credentialed CORS as a workaround.
