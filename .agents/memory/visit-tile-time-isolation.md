---
name: Visit tile time isolation
description: Prevent mixed Arabic host metadata from separating a visit time from AM/PM.
---

Keep a complete visit time together before host/department metadata in Security and Valet Admin tiles. Treat time and host metadata as separate bidirectional text units.

**Why:** The user supplied a mobile screenshot where concatenated English time and Arabic department text moved “PM” after the department. This is bidirectional reordering, not merely a lack of width; shortening the host or shrinking fonts alone does not address it.

**How to apply:** Preserve the localized time value and its suffix as one unit, and allow host metadata to wrap or truncate independently. Verify mixed-language content even when the interface itself is English.
