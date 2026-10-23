---
name: Reminder instant contract
description: Why old local-time timer tests must not reinstate a retired reminder fallback.
---

Upcoming alerts require the backend's explicit-offset visit start. If it is
unavailable, do not invent an instant from display dates/times or assume midnight.

**Why:** Older tests survived the migration to absolute timestamps and still
expected retired device-local parsing. Reinstating that behavior to make those
tests pass would make alerts depend on the device timezone rather than the
scheduled instant.

**How to apply:** Preserve the current contract when migrating fixtures. Keep
coverage for threshold boundaries, rescheduling, eligibility, cancellation,
foreground recovery and server clock offsets against explicit absolute times.
Missing or ambiguous backend timestamps require contract verification, not a
silent local-time fallback.
