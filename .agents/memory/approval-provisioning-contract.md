---
name: Approval and provisioning boundaries
description: Committed approval, follow-up provisioning failures and subsequent cancellation are distinct outcomes.
---

An approval can commit successfully while follow-up QR or resource provisioning fails. Treat that as committed approval with a warning, not a failed approval to resubmit. A later cancellation can win before the approval response returns; show the authoritative returned/current status rather than assuming HTTP success means currently approved.

**Why:** The supplied backend handoff separates the SQL approval transaction from external resource operations. External side effects cannot commit atomically with SQL Server, and the contract does not promise a durable outbox or automatic recovery worker.

**How to apply:** Clear committed successes from approval selections, surface provisioning warnings, refresh authoritative records and never automatically resend approval to repair provisioning. Keep provisioning failure distinct from pending device revocation. Treat documented backend behavior as a contract, not evidence of deployment or physical-reader verification.
