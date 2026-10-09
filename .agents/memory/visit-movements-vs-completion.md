---
name: Visit movements vs completion
description: Contract distinction between physical visit movements and lifecycle completion
---

Treat each recorded entry and exit as a physical event, distinct from lifecycle completion but displayed within the same Request Timeline. Show approval steps first, then every recorded check-in and checkout chronologically, then Visit Completed; do not use a separate movement-history box. Trust backend status for completion; do not require scheduled-end expiry in the frontend. Link entries to exits by the backend's departure event ID, not by their positions in an array. An administrative closure is not a physical checkout.

Keep planned Check-in and Check-out milestones visible in grey when their corresponding physical events are not recorded, even if the movement-history feed is present but empty. Recorded events are green; repeated entries/exits remain distinct and chronological, without an extra duplicate milestone for a movement type already recorded. A grey planned step is not a fabricated event and has no event timestamp.

**Why:** Visitors may leave and re-enter multiple times. Singular summary timestamps cannot describe that history. The user explicitly corrected the separate-box presentation: movements belong between approval and completion in one timeline. The user also wants the whole future lifecycle visible while awaiting a visitor response, not a jump straight from response to completion.

The backend handoff supplied on 2026-10-09 supersedes the prior scheduled-end completion assumption: parking has ENTRY readers only, and building/reception OUT completes a visit without parking OUT. Further cycles are governed by backend access-window/re-entry rules, not the frontend clock or Completed status alone. QR activation is authorization, not physical entry.

**Why:** These are explicitly confirmed product behaviors in the supplied reader-based movement handoff. Parking departure is not independently measured, and backend source changes do not prove deployed activation.

**How to apply:** Preserve backend status and independent latest IN/OUT values, never implement scan-parity classification, and do not restore Receptionist manual movement buttons. Automatic Matrix activation remains backend-owned and requires the approved mapping version and UTC activation time; frontend publication does not enable it.

**How to apply:** On visit detail screens consume the server's movement-history events for physical history; keep unrecorded movement milestones pending rather than inventing completed events. On status and action screens use the server's `completed` status for lifecycle completion. Avoid fabricating movement records from summary timestamps when the history is absent.

For table Actual In/Actual Out columns, confirm the backend response contract and repeated-movement semantics before changing frontend mappings. Distinguish deployed authenticated responses from repository source and frontend type declarations.

**Why:** The user specifically asked to check what the backend returns first because multiple check-in/checkout cycles are implemented. A singular summary can refer to the latest cycle rather than the first entry or final departure.

**How to apply:** Obtain sanitized responses covering entry, exit, re-entry, and completion; confirm the intended table summary and null behavior. Do not derive a pair from arbitrary event-array positions or download detail/history for every table row without an explicit design decision.

The product owner clarified that Actual In is the latest recorded physical check-in and Actual Out is the latest recorded physical checkout independently, even from an earlier cycle. After IN 09:00, OUT 10:00, IN 11:00, show 11:00 and 10:00. Administrative completion and QR expiry never supply checkout.

**Why:** A latest-cycle checkout that clears on re-entry does not meet the required historical summary. An OUT earlier than IN is valid, not corrupt data.

**How to apply:** Preserve existing current-presence field semantics unless an explicit contract change is agreed. Distinguish independent movement summaries from the current cycle. Investigations requested as report-only must not change application code or call live APIs.

Historical-summary rollout must wait for backend contract confirmation and authenticated QA. Keep rollback independent of backend event storage; do not repurpose legacy current-cycle fields.

**Why:** Backend implementation and frontend preparation can proceed concurrently, but source-only fixtures cannot prove deployed endpoint readiness. Enabling new semantics against mixed endpoint versions could label incomplete current-cycle values as historical summaries.

**How to apply:** Keep the display rollout disabled until integration verification. Once enabled, missing or invalid versioned summaries are unavailable, never a reason to fabricate values or fall back to completion/current-cycle checkout.

Availability restrictions override contradictory historical values. A successful movement followed by an unavailable summary is still a successful action: retry only the read.

**Why:** The backend handoff permits existing cross-host list rows while withholding their historical summaries, and separates committed movement outcomes from subsequent projection failures. Retrying writes can create unintended movement transitions.

**How to apply:** Keep list identity/scope intact, do not seek restricted data via per-row history requests, and never translate a missing projection into a failed check-in/out.

After a movement or reconnect, joining an already-running read alone is insufficient: schedule a canonical read after that request settles.

**Why:** React Query can reuse a pre-action response and clear invalidation. Query cancellation alone is also insufficient for services that share transport GETs without consuming its AbortSignal.

**How to apply:** Coalesce post-settlement reads per existing query, preserve inactive/removed-query boundaries, and ensure an action arriving during the canonical read queues a further read rather than replaying a write.

Keep operational record freshness separate from the historical-summary display rollout.

**Why:** Disabling an experimental display must not leave other roles' existing status lists stale after a committed movement. Conversely, an operational refresh must not enable gated history requests or expose restricted summaries.

**How to apply:** Refresh existing authorized records after successful actions even while summary presentation is disabled; keep summary-only background refresh and new history access behind their own readiness gates.