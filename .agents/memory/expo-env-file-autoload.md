---
name: Expo variant isolation and dotenv loading
description: Why variants resolve explicitly, how QA stays isolated, and why existing exports need rebuilding.
---

Production remains the default for standard publishing and existing EAS profiles.
Explicit QA/staging and the workspace preview use the user-confirmed QA backend,
including Microsoft sign-in. Firebase must remain unchanged.

**Why:** On 2026-10-19 the user confirmed the QA origin
`https://vms-backend-app-qa.replit.app` for preview and QA builds, superseding the
previous rule that every variant used production. Production builds remain live.

**How to apply:** Preserve the per-variant split and isolate cached authentication
by backend. Never reuse production sessions for QA or silently fall back to live
APIs when QA metadata is invalid. Existing published exports/binaries require a
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
