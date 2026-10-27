---
name: Expo variant isolation and dotenv loading
description: Why variants resolve explicitly, how QA stays isolated, and why existing exports need rebuilding.
---

Replit web publishing and the ordinary web export follow APP_VARIANT, including
Microsoft sign-in. Preview also follows APP_VARIANT after restart. Native mobile
profiles and the explicit production IIS export remain on production. Firebase
stays unchanged.

**Why:** On 2026-10-27 the user explicitly chose “Follow APP_VARIANT” for published
web, superseding the production publishing pin. A command-level variant override
had caused republishing to ignore their selected environment.

**How to apply:** Isolate cached authentication by backend. Keep publishing and
ordinary web-export commands free of variant overrides. The APP_VARIANT available
to the publishing build selects QA or production; it can differ from preview's
setting. Keep native EAS profiles and the explicit production IIS export pinned
to production. If no variant is provided, the existing production default applies.
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
