---
name: Expo .env.production auto-load and environment resolution
description: Why per-variant config is resolved explicitly in app.config.js instead of trusting process.env, and how production builds stay isolated from the QA shared env.
---
**Rule:** Resolve the intended application environment explicitly during export, and prefer its resolved Expo metadata at runtime over stale public process variables. Follow the current backend policy in `replit.md`; the Replit publishing runtime being called production does not determine which data environment the user wants.

**Why:** Expo loads `.env.production` for every export regardless of application variant, and Metro inlines `EXPO_PUBLIC_*` references. Changing a shared URL alone cannot redirect a bundle whose build script or runtime adapter fixes another target. The user has changed the desired Replit web target independently of native/IIS targets, so historical all-client policies are not authoritative.

**How to apply:** Keep explicit variant resolution and exported public values aligned with Expo metadata. Verify the generated JavaScript targets the selected backend in both QA and production. Browser configuration changes require rebuilding and republishing. Scan minified bundles token-by-token with context, not `grep -v`, which can discard the entire matching line.

**Rule:** Clear Metro's cache when changing the application's environment variant, not just the workflow's process.

**Why:** During the QA switch, a normal restart retained production-bound browser requests even after the resolver and workflow selected QA. Export verification used a clean build; the preview also needed a cache-clearing startup.

**How to apply:** Use Expo's `--clear` after variant changes and check the effective client target rather than assuming a restarted process rebuilt its environment metadata.

**Rule:** Verify browser API access separately from static build success.

**Why:** A successful export and rendered login page do not prove CORS, authentication callbacks, or signed-in API access. Backend origin approval is independent of the client target.

**How to apply:** Check the actual published frontend origin and the request's credentials mode; never suggest wildcard credentialed CORS as a workaround. Keep public frontend origins distinct from IIS's internal backend upstream to avoid self-proxy loops.
