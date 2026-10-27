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

Do not add a standalone Actual In/Out summary block to request or visitor detail
pages, even when valid movement-summary timestamps are available.

**Why:** The user explicitly corrected this scope: timestamp fixes for cards and
tables were not authorization to add UI to detail pages. This is not an
empty-value suppression rule.

**How to apply:** Keep movement history in the existing detail timeline. Preserve
corrected card/table timestamps and operational check-in/out logic separately;
enabling their summary display must not introduce a new detail-page section.

Do not render standalone QR/access-status notices (such as the bare "Expired"
label) on request or visitor detail pages.

**Why:** The user asked to remove this added notice above the timeline, separately
from the Actual In/Out block. Removing presentation is not authorization to change
QR expiry, approval eligibility, or other established expired-visit warnings.

**How to apply:** Omit the added QR-status notice on detail pages while retaining
QR visibility/validity guards, existing timelines, and approval restrictions.
Do not remove QR notices from invitation pages as part of this detail-only rule.
