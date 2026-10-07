---
name: Visit movements vs completion
description: Contract distinction between physical visit movements and lifecycle completion
---

Treat each recorded entry and exit as a physical event, distinct from lifecycle completion but displayed within the same Request Timeline. Show approval steps first, then every recorded check-in and checkout chronologically, then Visit Completed; do not use a separate movement-history box. A checkout during the scheduled window must not be shown as Visit Complete; the server must enforce final completion after the last checkout and scheduled end. Link entries to exits by the backend's departure event ID, not by their positions in an array. An administrative closure is not a physical checkout.

Keep planned Check-in and Check-out milestones visible in grey when their corresponding physical events are not recorded, even if the movement-history feed is present but empty. Recorded events are green; repeated entries/exits remain distinct and chronological, without an extra duplicate milestone for a movement type already recorded. A grey planned step is not a fabricated event and has no event timestamp.

**Why:** Visitors may leave and re-enter multiple times. Singular summary timestamps cannot describe that history, and equating the first exit with completion prematurely closes an active visit. The user explicitly corrected the separate-box presentation: movements belong between approval and completion in one timeline. The user also wants the whole future lifecycle visible while awaiting a visitor response, not a jump straight from response to completion.

**How to apply:** On visit detail screens consume the server's movement-history events for physical history; keep unrecorded movement milestones pending rather than inventing completed events. On status and action screens use the server's `completed` status for lifecycle completion. Avoid fabricating movement records from summary timestamps when the history is absent.

For table Actual In/Actual Out columns, confirm the backend response contract and repeated-movement semantics before changing frontend mappings. Distinguish deployed authenticated responses from repository source and frontend type declarations.

**Why:** The user specifically asked to check what the backend returns first because multiple check-in/checkout cycles are implemented. A singular summary can refer to the latest cycle rather than the first entry or final departure.

**How to apply:** Obtain sanitized responses covering entry, exit, re-entry, and completion; confirm the intended table summary and null behavior. Do not derive a pair from arbitrary event-array positions or download detail/history for every table row without an explicit design decision.