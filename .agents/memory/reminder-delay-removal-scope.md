---
name: Reminder delay removal scope
description: Removing the configurable cancellation delay does not authorize changing cancellation lifecycle behavior.
---

The user requested removal of the Auto-Cancel Delay field and a backend handoff, not removal of all automatic cancellation.

**Why:** Only this field was circled in the request; reminder delays, office hours, working days, and other settings must remain unchanged.

**How to apply:** Keep frontend saves free of the retired setting. Do not introduce a hidden replacement delay or disable cancellation rules to compensate for backend dependencies; have the backend team identify any business-rule decision needed.