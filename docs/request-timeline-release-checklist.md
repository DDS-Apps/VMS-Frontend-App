# Request timeline presentation release checks

## Scope

Consume optional `movementHistory.presentation` from visit details or the existing
authenticated movement-history endpoint. This changes display only: status,
permissions, filters, mutations, attendance, QR access, polling, and audit data
remain unchanged. No extra per-list-row history reads are introduced.

The standalone MovementHistory audit renderer retains the full event feed; only
the request timeline and explicitly supplied detail badges use closure hiding.

## Fixture coverage

- Completed no-attendance administrative closure: one localized No-show badge and
  final row, without closure explanation, completion row, or unfulfilled movements.
- Acceptance followed by no attendance: preserve the real acceptance occurrence.
- Multiple administrative records: hidden IDs stay in the source; one replacement
  at its supplied occurrence, keyed to its stable source event.
- Repeated entry/exit cycles: distinct IDs and original timestamps remain visible.
- Open building arrival at daily cutoff: completion uses canonical completedAt,
  or the explicitly hidden daily-cutoff occurrence if completedAt is absent.
  Completion never supplies checkout or Actual OUT.
- Earlier checkout before open re-entry remains visible.
- Legacy recorded attendance remains visible when absent from the event feed.
- Missing history/presentation, physical parking or orphan checkout evidence, and
  stale closure instructions do not imply No-show.
- Genuine rejection/cancellation outcomes remain visible regardless of icon colour.
- Only the three allowed helper effects can be hidden; access-denied and visible
  administrative-closure explanations remain.
- English and Arabic shared role timelines and detail badges render localized
  labels; ordinary list badges retain their status mapping.
- Existing QR access and history reconciliation regressions remain covered.

## Controlled release verification still required

The supplied handoff describes staged backend source, not a verified deployment.
Do not activate a live-connected backend, send visitor messages, operate readers,
or mutate live visits merely to verify labels.

In an authorized nonproduction environment:

1. Confirm both existing detail and direct history responses supply the documented
   presentation fields, stable IDs, occurrence times, and completion reasons.
2. Check each of the four cases in authenticated Employee/Manager, Receptionist,
   and Security details. Confirm cancelled/current requests cannot retain a stale
   No-show label.
3. Check an older response without presentation for compatibility.
4. Inspect English/Arabic layouts on native devices, including large text and
   repeated cycles. Verify readable dates/times and a single final row.
5. Confirm source/audit records, physical IN/OUT, QR validity and actions remain
   unchanged before and after display.

Rendered fixture tests are not a live account, native-device, provider, reader,
or backend deployment verification.
