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

**Backend contract:** The production Swagger at
https://vms.dallah.com/api/docs describes visit/service starts as canonical
ISO 8601 UTC across visit, reception, parking and buffet/staff responses.

**Why:** This is external contract evidence for requiring an explicit timezone;
frontend type declarations alone would not establish the backend's format.

**How to apply:** Recheck the published contract when changing accepted formats.
Documentation and historical samples do not prove that every current
authenticated row contains the field; distinguish format compatibility from
live endpoint coverage.

Persisted upcoming-notification localization must preserve the original
server-authored minute value, not recompute it from the current clock or assume
the default reminder threshold.

**Why:** Notifications remain visible long after delivery, and the backend's
English reminder body may be the only source of its original minute value.
Recomputing it would change historical content, not just translate it.

**How to apply:** Translate recognized legacy copy without changing its timing
or identity. Prefer supplied structured display values and preserve unfamiliar
server messages rather than inventing missing details.
