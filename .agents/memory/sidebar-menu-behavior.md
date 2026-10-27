---
name: Mobile sidebar menu behavior
description: Mobile app and mobile-web hamburger toggling versus desktop navigation.
---

On mobile apps and mobile web, the hamburger button must toggle the sidebar:
one tap opens it, the next closes it. Outside tapping must continue to close
it. Preserve back-button behavior on detail screens and the persistent desktop
sidebar.

**Why:** The user explicitly reported that outside dismissal worked but a second
hamburger tap did not, and requested the same toggle behavior on both mobile
surfaces without a navigation redesign.

**How to apply:** Treat animation-in-progress behavior separately from whether
the drawer remains mounted. Repeated taps must allow reopening during a close
animation; rendered handler tests are not evidence of real-device touch delivery.
