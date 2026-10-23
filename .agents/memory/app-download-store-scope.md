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

The login download section is for web browsers only, including mobile browsers;
hide the whole section in installed iOS and Android apps.

**Why:** The user explicitly confirmed that the app-download blocks should not
appear inside the native apps, but must remain visible on web and mobile web.

**How to apply:** Distinguish the runtime platform, not screen width or mobile
user-agent detection. Keep both QR destinations and their matching links intact.
