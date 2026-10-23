---
name: Expo variant isolation and dotenv loading
description: Why variants resolve explicitly, how QA stays isolated, and why existing exports need rebuilding.
---

Replit web publishing and web preview target QA, including Microsoft sign-in.
Native mobile profiles and the explicit production IIS export remain on production.
Firebase stays unchanged.

**Why:** On 2026-10-23 the user requested QA APIs for web only, superseding the
earlier all-platform production target for web, but not for native apps or IIS.

**How to apply:** Preserve the per-variant split and isolate cached authentication
by backend. Select QA explicitly in web-only commands and keep native EAS profiles
and the production IIS export explicitly production. Changing workspace APP_VARIANT
alone cannot override a hardcoded deployment build variant.
Do not reuse QA sessions for production or silently fall back to live APIs when QA
metadata is invalid. Existing published exports/binaries require a
separate rebuild and publish; changing workspace variables does not update them.

Resolve variants explicitly rather than trusting loaded process dotenv values.

**Why:** Expo loads `.env.production` for every export regardless of variant,
and Metro inlines public environment references. Stale production or QA process
variables must not redirect the chosen build.

**How to apply:** Keep runtime URLs aligned with resolved Expo configuration,
guard production against QA/dev URLs, and verify exported hostnames in both
directions. Scan tokens with context, not `grep -v` on minified bundles. Production
web's public origin is distinct from IIS's real backend upstream; avoid self-proxy
loops.

Backend CORS and SSO redirects still need authorization for the frontend origin.

**Why:** A valid build target and a rendered login page do not prove authenticated
API or Microsoft callback access.

**How to apply:** Check exact origins separately without wildcard credentialed
CORS, live workflow mutations, or claiming authenticated verification from a
static export.
