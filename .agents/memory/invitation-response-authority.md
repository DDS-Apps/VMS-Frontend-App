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

Hide the pre-activation “Not active yet” notice on the public invitation page
in both languages, without changing activation or QR validity.

**Why:** The user requested removing this message from the invitation display,
not changing when entry becomes valid.

**How to apply:** Keep expiration, revocation, and other access warnings intact;
do not extend this display-only suppression to other screens without a request.
