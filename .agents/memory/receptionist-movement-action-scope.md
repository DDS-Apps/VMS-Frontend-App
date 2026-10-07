---
name: Receptionist movement action scope
description: Approved Receptionist Visit Detail scope excludes manual check-in and checkout actions.
---

Do not expose Check-In or Check-Out actions on the Receptionist Visit Detail page on either web or mobile. Preserve read-only movement history and pending entry/exit milestones.

**Why:** The user states these actions were removed from the Receptionist scope a long time ago and were absent in previous builds. Their reappearance is a scope regression, not authorization to extend Receptionist duties.

**How to apply:** Check the Receptionist-specific detail route for normal visits, walk-ins, and repeated-entry states. Keep Security's physical-movement workflow and other approved Receptionist actions unchanged. Do not infer permission to remove backend endpoints or change lifecycle semantics from this UI request.
