---
name: Invitation response authority
description: QR issuance does not establish that a visitor accepted a public invitation.
---

Treat the backend visitor response/status as the source of truth for invitation
acceptance. QR presence must never turn a pending invitation into an accepted
one or suppress its permitted Accept/Reject actions.

**Why:** A live QA public-invite response returned `visitor_pending`, a null
visitor decision, and both response actions enabled while already containing
a QR code. The published frontend incorrectly inferred acceptance from QR
presence, contradicting the Manager dashboard.

**How to apply:** Keep response state separate from QR issuance and QR validity.
Cover pending-with-QR responses explicitly when testing the public invitation
page. Diagnose live state with read-only GET requests; do not accept or reject
a user's invitation merely to verify presentation.
