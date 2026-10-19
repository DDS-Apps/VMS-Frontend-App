---
name: Timeline display boundaries
description: No-show and daily-cutoff timeline wording is backend-directed presentation, not a workflow or attendance change.
---

Use supplied timeline presentation instructions for detail displays only. No-show
is a display label for completed administrative closure without recorded attendance,
not a stored status or proof that the visitor physically never arrived.

**Why:** The backend handoff explicitly supersedes earlier "Admin closure" wording
for no-attendance cases while preserving status, movement/audit records, QR policy,
and permissions. Missing history alone is insufficient evidence.

**How to apply:** Do not infer No-show from completed status, visitor acceptance,
or the clock. Preserve recorded acceptance and all physical cycles. Daily-cutoff
completion never proves checkout. Keep audit sources intact and avoid per-row
history requests to extend detail-only labels to lists.

Generic presentation flags (hidden rows, unrecorded steps, helper notes) apply
to active visits too; only the No-show override requires completed status and
the no-attendance closure evidence checks.

**Why:** The user supplied an active `visitor_accepted` parking arrival with
`hideUnrecordedSteps: true`; a completed-only guard incorrectly showed empty
building check-in/out milestones beside its genuine parking movement.

**How to apply:** Keep backend movement order and stable IDs, suppress gate
details, and never append legacy physical timestamps alongside present history.
The latest correction requires legacy row fallback only when history is absent,
superseding the older cutoff handoff's allowance for supplemental legacy rows.
Legacy attendance still blocks No-show; an identified cutoff can supply missing
completion time but never checkout. Keep actionable future controls outside the
recorded-event track rather than removing existing permitted actions.
