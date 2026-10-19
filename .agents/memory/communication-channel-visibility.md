---
name: Communication channel visibility
description: SMS visibility in create-request forms is separate from notification delivery policy.
---

Hide the SMS chip in normal and walk-in request creation without removing SMS
support or changing existing delivery/payload decisions.

**Why:** The user explicitly asked to “just hide dont remove.” A hidden control
does not authorize disabling SMS notifications, removing its channel value, or
changing backend behavior.

**How to apply:** Treat channel visibility as presentation-only. Any later
change to SMS delivery policy needs separate authorization; do not extend this
creation-form request to edit/detail communication controls automatically.
