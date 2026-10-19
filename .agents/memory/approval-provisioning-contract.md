---
name: Approval and provisioning boundaries
description: Committed approval, follow-up provisioning failures and subsequent cancellation are distinct outcomes.
---

An approval can commit successfully while follow-up QR or resource provisioning fails. Treat that as committed approval with a warning, not a failed approval to resubmit. A later cancellation can win before the approval response returns; show the authoritative returned/current status rather than assuming HTTP success means currently approved.

**Why:** The supplied backend handoff separates the SQL approval transaction from external resource operations. External side effects cannot commit atomically with SQL Server, and the contract does not promise a durable outbox or automatic recovery worker.

**How to apply:** Clear committed successes from approval selections, surface provisioning warnings, refresh authoritative records and never automatically resend approval to repair provisioning. Keep provisioning failure distinct from pending device revocation. Treat documented backend behavior as a contract, not evidence of deployment or physical-reader verification.

A known server rejection remains authoritative for an unchanged approval schedule, even when the client clock or repeated reads still suggest eligibility. Re-evaluate after schedule, status or permission changes instead of letting identical stale data re-enable immediate approval.

**Why:** Client/server clock differences and schedule-resolution differences can otherwise return a server-expired or invalid request to the same selection immediately after it was rejected.

**How to apply:** Keep this protection local to Manager approval eligibility; do not change QR validity, request status or the specialized walk-in deadline rules.
