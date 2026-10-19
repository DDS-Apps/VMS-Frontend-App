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
- Documented workflow codes are preserved separately from transport categories:
  409 `VISIT_APPROVAL_EXPIRED`, and 422 `VISIT_APPROVAL_INVALID_SCHEDULE` /
  `VISIT_APPROVAL_ALREADY_PROCESSED`. Known codes receive English/Arabic
  guidance. An uncoded 409 remains a generic request-state conflict.
- Single approval is a direct object. Display its returned status, not a
  hardcoded approved outcome. QR and `reminderSchedule` are optional; legacy
  optional `reminders` remains accepted for compatibility.
- `provisioningPending` means approval committed but follow-up setup did not
  complete. Display a warning and refresh; never automatically resubmit
  approval. It does not promise a retry worker and is unrelated to QR
  `revocationPending`. A returned cancelled status must stay cancelled.
- Existing detail caches reconcile the returned status without seeding partial
  details or inferring QR validity. List/detail/history queries are invalidated.
- Bulk results use the existing `successCount`, `failedCount`, `failedIds` and
  `results: [{id, success, error?, code?, warning?}]` response. HTTP success is
  not all-item success. Show recorded approvals, failures and successful-item
  provisioning warnings. Never expose unknown raw backend text.
- Committed successes leave retry selection even if provisioning is pending or
  a duplicate result position failed. Server-expired, invalid-schedule and
  already-processed failures are not retained for immediate retry based only
  on the client clock. Re-reading the same unchanged schedule cannot re-enable
  a known server-rejected row; a corrected schedule/status/permission is
  evaluated normally. Other still-eligible failures can remain selected.
- More than 50 eligible IDs are blocked with localized feedback, without
  truncation, automatic batching, downloading more pages or resetting scope.
- Host cancellation 409 refreshes current request state without workflow retry.

## Isolated frontend verification

Serialized sanitized handoff fixtures are in
`__tests__/fixtures/approval-handoff.json`. The HTTP-service and real-mutation
tests use an in-memory Axios adapter, never a live backend. Rendered-screen
tests exercise approval callbacks, warning messages, retry selections and batch
limits. Eligibility, walk-in and transport regression coverage remains separate.
These checks do not establish deployment, real SQL Server concurrency or reader
operation.

## Reported backend verification

The supplied handoff reports isolated service/Nest HTTP tests using in-memory
transaction serialization and mocked SQL updates. The backend changes were
staged, not published. This frontend change does not independently reproduce
those backend tests or change backend deployment state.

## Controlled backend checks (not yet performed)

Use approved test accounts and disposable visits in the designated test
environment, not production visits. Confirm the published backend target first.

- Single approval: immediately before, exactly at and after scheduled end.
- Bulk approval: one valid and one expired visit, then an all-expired batch.
- Authorization: unrelated manager and unauthorized IDs within a bulk request.
- Races: request expires or is cancelled while approval waits to commit.
- Confirm no status change, QR issuance, notification, allocation or access
  provisioning for each rejected item.
- Record sanitized actual statuses and response bodies; compare the documented
  codes and envelopes with the test environment's deployed implementation.
- Test real SQL Server lock waits/multiworker races and duplicate ID positions.
- Inject a post-commit QR/resource failure: it is a committed success with a
  warning, not a rejected item. Confirm cancellation during provisioning is not
  overwritten and that the response reports its latest status.
- Confirm guarded cancellation conflicts dispatch no losing-side resource or
  revocation effects. Establish operational recovery ownership: no durable
  outbox or automatic recovery worker is promised by the handoff.
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
- Repeat with committed provisioning warnings and cancelled-after-commit
  responses. Verify warnings/statuses in English/Arabic and that no second
  approval or walk-in follow-up edit is submitted for a cancelled/pending-setup
  outcome. Exercise 50 and 51 selected eligible requests.
