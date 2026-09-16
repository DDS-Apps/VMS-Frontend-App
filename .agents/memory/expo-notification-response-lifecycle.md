---
name: Expo notification response lifecycle
description: Safe handling of notification taps that cold-launch or resume the mobile app.
---

Treat Expo's last notification response as a pending, persisted event: do not
mark it consumed until navigation is ready and routing succeeds, then clear it
from Expo so a later ordinary relaunch cannot reopen stale content.

**Why:** A response listener alone misses terminated-app launches. Conversely,
reading the last response without clearing it can replay an old tap after a
process restart, while marking it handled before navigation is ready can drop
the intended route.

**How to apply:** Route live and last-response taps through one deduplicated
handler. Leave an unrouteable response pending for a later authenticated,
navigation-ready retry, and clear the native last response only after the route
has been dispatched.