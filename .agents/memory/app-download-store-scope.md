---
name: Production app download scope
description: Login download QR codes must target production store listings independently of the frontend's backend variant.
---
Login app-download QR codes and their matching links must point to the
owner-confirmed production App Store and Google Play listings, including when
the frontend uses the QA backend.

**Why:** The user explicitly requested QR codes for the production Android and
iOS apps and supplied both official store destinations.

**How to apply:** Keep app-download destinations independent of API environment
selection. Do not substitute TestFlight, EAS preview, or guessed listings, and
do not change authentication, backend selection, or native build variants to
add download links.
