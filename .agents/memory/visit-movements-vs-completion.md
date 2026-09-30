---
name: Visit movements vs completion
description: Contract distinction between physical visit movements and lifecycle completion
---

Treat each recorded entry and exit as a physical event, separate from the workflow summary timeline and lifecycle status. A checkout during the scheduled window must not be shown as Visit Complete; the server must enforce final completion after the last checkout and scheduled end. Link entries to exits by the backend's departure event ID, not by their positions in an array. An administrative closure is not a physical checkout.

**Why:** Visitors may leave and re-enter multiple times. Singular summary timestamps cannot describe that history, and equating the first exit with completion prematurely closes an active visit.

**How to apply:** On visit detail screens consume the server's movement-history events for physical history; on status and action screens use the server's `completed` status for lifecycle completion. Avoid fabricating movement records from summary timestamps when the history is absent.