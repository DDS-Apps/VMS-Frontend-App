---
name: QR retention contract
description: Backend handoff distinguishes QR access validity from meeting end, approvals, and physical movements.
---

QR access must follow backend validity, not expire solely at meeting end. Preserve the 60-minute-before-start activation distinction. Retention after meeting end requires backend retainedUntilCheckout; present “Valid until checkout or 9 PM,” not guaranteed access until 9 PM. Checkout before meeting end may allow re-entry; later checkout may expire access.

**Why:** The user supplied this revised backend handoff on 2026-10-16. Visit completion, approval deadlines, and access validity have different meanings.

**How to apply:** Use current server fields and invitation permissions; retained access never permits late acceptance. HTTP 410 overrides cached QR/acceptance snapshots. Show administrative completion separately from physical checkout, preserve backend movement labels/effects, and replace corrected events by stable ID. Obtain confirmed response shapes for unspecified revocation fields rather than inventing them. This is a contract requirement, not evidence that frontend changes or backend deployment are complete.
