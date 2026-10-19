# Manager approval expiry release checks

Frontend eligibility is an early user-interface guard, not server authorization.
Do not consider the API protected until both backend endpoints have been checked.
No production writes or publication are part of this change.

## Frontend contract

- Scheduled pending Manager approvals stop at `now >= scheduled end`.
- End timestamps with an explicit offset are absolute. Wall-clock schedules use
  Asia/Riyadh; start plus a valid duration is the fallback, not end of day.
- An unresolved scheduled end disables approval and asks the user to refresh.
- The pending-approvals endpoint implies pending status when its DTO omits it.
  Its raw schedule, not display-layer defaults, determines eligibility.
- Existing walk-in policies are unchanged, including the strictly-after cutoff
  for Manager-pending walk-ins and date-only Host-pending behavior.
- QR retention and QR expiry fields never extend the approval deadline.
- Single and bulk submissions recheck the latest scoped record and current clock.
- A 409 is shown as a request-state conflict, not assumed to prove expiry;
  exact backend expiry codes have not been confirmed.
- Bulk results use the existing `successCount`, `failedCount`, `failedIds` and
  `results: [{id, success, error?}]` response. HTTP success is not all-item success.

## Controlled backend checks (not yet performed)

Use approved test accounts and disposable visits in the designated test
environment, not production visits. Confirm the published backend target first.

- Single approval: immediately before, exactly at and after scheduled end.
- Bulk approval: one valid and one expired visit, then an all-expired batch.
- Authorization: unrelated manager and unauthorized IDs within a bulk request.
- Races: request expires or is cancelled while approval waits to commit.
- Confirm no status change, QR issuance, notification, allocation or access
  provisioning for each rejected item.
- Record sanitized actual statuses and response bodies; confirm the existing
  bulk envelope and error reasons before adding any machine-code-specific UI.
- Confirm existing Host/Manager walk-in paths and issued retained QR access
  remain unchanged.

## Device checks (not yet performed)

- On iOS, Android and web, select a visit before its cutoff and remain on-screen.
  At the cutoff it becomes unselectable and is removed from approval selection,
  with a skipped-request notice. Filters, page scope and scroll position remain.
- Repeat after leaving the screen and after backgrounding across the cutoff.
- Repeat in English and Arabic, with the device timezone outside Riyadh.
- Submit a mixed batch and verify successful selections clear, eligible failures
  remain, failure reasons are visible, and no automatic approval retry occurs.
