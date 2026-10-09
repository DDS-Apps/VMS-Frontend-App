# Reader-based movements: frontend compatibility

## Authority and rollout

The supplied backend handoff is `attached_assets/Pasted-Frontend-implementation-prompt-reader-based-visitor-mov_1791533895270.txt`. It supersedes the earlier scheduled-end completion assumption: parking readers are entry-only, and building/reception OUT completes a visit according to the backend. Completion is not proof of parking departure. Re-entry depends on backend eligibility, never frontend clocks, scan parity or a Completed badge alone.

`MOVEMENT_SUMMARY_ENABLED` remains **false**. No frontend publish enables Matrix processing. Backend deployment, mapping version **skbc-reader-v1**, an approved UTC activation timestamp and the existing authenticated readiness checks are still required. No gates or notifications were triggered during this work.

## Audit and changes

- Fixed the legacy shared Security timeline's physical-exit timestamp fallback: administrative completion cannot create an exit. A backend Completed state can have a separate completion milestone without physical OUT.
- The Security detail screen retains recorded entry timestamps after completion and displays backend completion separately from exit.
- Visit/Security detail polling now includes approved/accepted, checked-in, checked-out and completed records. Completed polling can observe a permitted re-entry, but grants no access. The nested valet dashboard also polls its existing endpoint; no per-visitor history downloads were added.
- QR validation mutation explicitly disables write retries and invalidates canonical records without patching them to Checked in or chaining a gate movement.
- Existing Security manual service calls validate their reader IDs against the supplied **manual assertion** compatibility contract. Parking, unknown and wrong-direction IDs fail before transport. Generic building identifiers remain supported. This filter is not an automatic Matrix event classifier, an authorization control or a gate configuration UI; the backend remains authoritative.
- Independent latest IN/OUT summary handling, restricted/unavailable metadata, visit-timezone formatting, nested valet envelope selection, full timeline event identity deduplication and post-write read refresh/race handling were already implemented and are retained.
- A successful action with an unavailable summary remains successful. Mutations are not retried to obtain a missing projection.
- Committed action refreshes use the existing post-settlement canonical-read queue independently of the display rollout flag. Background summary-only refresh remains gated; no disabled history endpoint is activated.
- Receptionist still has no manual Check-In/Check-Out controls. Vehicle details, parking slots and allocation details remain hidden. No parking-arrival/presence field or occupancy display was added.
- No scan parity/every-third-scan/parking-counter classification or automatic parking-to-building action chain was found in the current operational frontend.

## API/UI gaps, not invented contracts

1. **No active QR scanner or QR success page:** the current repository exposes a scan service/hook, but no screen consumes it. Its existing DTO has `valid`, `message`, `canCheckIn`, `canCheckOut` and optional visit identity/visitor. The handoff does not provide a sanitized deployed activated response envelope or a documented activation-status field. Do not invent a field or new success page. Obtain examples before exposing that workflow.
2. **No manual gate selector or active Security gate-action caller:** the service/hooks exist but current Security screens are read-only. `/api/v1/gates/config` is typed only as `{isConfigured:boolean}` and is not evidence of reader capabilities, direction, labels or user-scoped permissions. Adding operator controls requires a separately approved workflow and documented backend capabilities; do not invent a default gate ID or revive Receptionist actions.
3. **No new parking-presence/history contract:** do not infer parking arrival/departure timestamps, occupancy, provider-reader provenance or movement permissions from parking-required state.
4. **No deployed evidence supplied:** the attachment describes implemented backend source behavior, not verified deployment/activation. Existing sanitized offline handoff fixtures establish frontend compatibility only. Physical idempotency, eligibility and reader classification remain backend responsibilities.

## Verification and release checklist

Mock-only coverage checks manual ID/direction filtering, generic operator assertions, server denials without retries, independent latest OUT retained after re-entry with and without parking, null/administrative completion, restrictions/unavailability, replay deduplication, all reported cycles, QR activation without optimistic movement, bilingual timelines and polling for completed records. Existing movement envelope, read-race, mutation refresh and Receptionist permission tests are included in the focused regression set.

These checks do not prove deployed hardware behavior. Before rollout obtain sanitized real endpoint envelopes, verify mapping/version/UTC activation approval with the backend team, confirm the previously documented restricted-summary/security/performance readiness conditions, and validate signed-in role screens in English/Arabic on web/iOS/Android. Run real-reader or notification tests only under separately authorized controlled QA.

The running app's public sign-in page was visually verified; signed-in movement screens and physical devices were not accessed. An earlier test command did not finish within its shell deadline after reporting results, and an open-handle diagnostic timed out. Test assertions and runner exit status must be reported separately.

Final verification: **13 focused suites / 448 tests passed** with `--runInBand --silent --forceExit`. TypeScript (`tsc --noEmit`) and `git diff --check` passed. Forced exit is a test-runner cleanup limitation, not proof that open handles have been resolved.

## Changed implementation and test files

- `utils/manualBuildingGates.ts`
- `utils/movementPolling.ts`
- `services/api/securityApiService.ts`
- `hooks/queries/invalidateMovementSummaries.ts`
- `hooks/queries/useSecurityQueries.ts`
- `hooks/queries/useReceptionQueries.ts`
- `hooks/queries/useApprovalQueries.ts`
- `hooks/queries/useValetAdminQueries.ts`
- `components/shared/RequestTimeline.tsx`
- `screens/Security/SecurityVisitorDetailScreen.tsx`
- `__tests__/readerBasedMovements.test.ts`
- `__tests__/movementMutationRefresh.test.tsx`
- `__tests__/movementEnvelopes.test.ts`
- `components/shared/__tests__/RequestTimeline.movements.test.tsx`

This audit and `docs/actual-in-out-backend-requirements-and-frontend-plan.md` record contract precedence and release boundaries.
