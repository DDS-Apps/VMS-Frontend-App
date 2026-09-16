---
name: Expo .env.production auto-load and environment resolution
description: Why per-variant config is resolved explicitly in app.config.js instead of trusting process.env, and how production builds stay isolated from the QA shared env.
---
**Rule:** Resolve QA/production public URLs through `config/app-environments.js` (committed defaults > explicitly parsed variant file > `EXPO_PUBLIC_*` process env); never read non-prefixed keys from `process.env`, never put `EXPO_PUBLIC_*` keys in `.env.production`/`.env.staging`, and let the app read `Constants.expoConfig.extra.*` before `process.env.EXPO_PUBLIC_*`.

**Why:** The Expo CLI loads `.env.production` for *every* `expo export` (NODE_ENV=production) regardless of `APP_VARIANT`, so production values in that file leak into QA builds. The Replit shared env holds the QA `EXPO_PUBLIC_*` URLs, so `APP_VARIANT=production` must ignore process env (with a warning) or `eas build --profile production` cannot even be started from the workspace. Metro inlines `process.env.EXPO_PUBLIC_*` literally, so runtime code that prefers `process.env` would bypass any guard placed in `app.config.js`.

**How to apply:** New per-environment values go into `config/app-environments.js` (+ `publicEnvFor`, + `extra` in `app.config.js`); production web builds go through `scripts/build-web.js`, which also verifies the inlined `apiBaseUrl` matches the variant. Bundle scans must not use `grep -v` on minified output — one filtered line hides the whole bundle; scan token-by-token with context instead.
