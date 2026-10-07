# Actual In / Actual Out: backend requirements and frontend implementation plan

Date: 2026-10-07  
Status: proposed contract and implementation plan; no application changes authorized or made by this document.

## 1. Goal and safety boundaries

Display the latest physical check-in and the latest physical checkout independently, across relevant web, iOS, and Android screens.

- Actual In = latest recorded physical check-in.
- Actual Out = latest recorded physical checkout, even from an earlier entry/exit cycle.
- OUT earlier than IN is valid after re-entry.
- Administrative completion, scheduled end, cancellation, and QR expiry/revocation are not physical checkout events.
- A visitor with no physical checkout must have no Actual Out.

Preserve current-presence logic, movement permissions, QR validation, lifecycle/status transitions, approval workflows, filters, pagination, ordering, and existing completion/cutoff policy.

This plan minimizes regression risk; it cannot guarantee zero regressions without implementation and verification. Release gates below are mandatory.

## 2. Evidence and limitations

The investigation inspected the shared Expo/React Native frontend source. It did not call live APIs or inspect the backend implementation. Installed/store build parity is unknown.

The backend context supplied by the product owner says existing `checkedOutAt` clears on re-entry. Treat that field as a current-cycle field until backend owners confirm its full contract.

Some frontend tables already consume flat physical timestamps. Others discard them or omit actual-time bindings. Therefore backend changes alone cannot complete the work.

The current Valet frontend allows operational completed visits with parking required. Whether its endpoint excludes completed visits is unverified. Do not change endpoint visibility based on an assumption.

## 3. Backend requirements

### 3.1 Add a separate, additive summary contract

Proposed field names below require agreement before implementation. Do not rename or redefine existing fields.

Add this object to each authorized visit row and visit detail:

```ts
movementSummary: {
  version: 1;
  latestCheckInAt: string | null;
  latestCheckOutAt: string | null;
}
```

Also expose the visit's existing canonical `timezone` as an IANA identifier where it is not already present, for example `Asia/Riyadh`.

Example after IN 09:00, OUT 10:00, IN 11:00 in Riyadh:

```json
{
  "movementSummary": {
    "version": 1,
    "latestCheckInAt": "2026-10-07T08:00:00.000Z",
    "latestCheckOutAt": "2026-10-07T07:00:00.000Z"
  },
  "timezone": "Asia/Riyadh"
}
```

The UTC values represent 11:00 and 10:00 in Riyadh, respectively.

**Compatibility requirements**

- Keep `checkedInAt`, `checkedOutAt`, `checkInTime`, `checkOutTime`, `completedAt`, `timeline`, and `movementHistory` semantics unchanged.
- Do not use the new historical summary to calculate current presence or authorize entry/exit.
- Do not change response envelopes, row identifiers, pagination metadata, status-count meanings, sorting, or default filters.
- Old clients must continue working while ignoring the additive object.
- New clients must tolerate older responses that omit the object.
- Adding the object must not broaden role access or expose additional visitor, actor, gate, or vehicle details.

### 3.2 Summary computation

- Compute IN and OUT independently from genuine recorded physical movement events.
- Proposed interpretation: select the latest physical event by `occurredAt`, not by array position or most recent database insertion.
- Backend owners must explicitly confirm treatment of backdated/corrected events and legacy records before implementation. If the product meaning differs, document it before coding.
- Administrative-completion events must never contribute to either physical summary.
- Re-entry updates IN without clearing historical OUT.
- Completion/expiry without another checkout leaves both physical summaries unchanged.
- Do not invent legacy events from scheduled times, QR expiry, completion timestamps, or guessed offsets.
- Where evidence is insufficient to establish a physical movement timestamp, return `null`.
- Existing audited legacy movement evidence may be used only under a documented migration/provenance rule.
- Apply the same computation across list, detail, and mutation-related reads.
- The summary must become consistent with the successful movement write. Document any unavoidable asynchronous lag; do not leave stale caches indefinitely.

### 3.3 Missing and invalid values

| Situation | Required response |
|---|---|
| Endpoint supports the contract, no physical movements | Object present, both timestamp fields `null` |
| Check-in only | IN timestamp, OUT `null` |
| Re-entry after an earlier checkout | New IN timestamp, historical OUT retained |
| Endpoint has not been upgraded | Object omitted; this means unsupported, not “no movements” |
| Unknown/insufficient physical evidence | Corresponding field `null`; no fabricated value |
| Empty string or invalid timestamp | Never emit as a valid supported response |
| Unsupported future contract version | Client must not reinterpret it silently |

Use ISO 8601 absolute timestamps with UTC `Z` or explicit offsets. Prefer UTC consistently. Do not send localized AM/PM text or timezone-less wall-clock strings for physical events.

### 3.4 Endpoint coverage

Add the same summary object wherever an authorized visit row is returned. Preserve each endpoint's existing shape.

| Endpoint | Required placement / notes |
|---|---|
| GET `/api/v1/visits` | Each visit in the existing paginated `data[]`; covers My Requests, Building Admin, Receptionist lists and Security list source |
| GET `/api/v1/visits/:id` | On the detail object, alongside—not replacing—timeline and movement history |
| GET `/api/v1/reception/today` | Each visit in `data[]`; keep existing `summary` aggregates |
| GET `/api/v1/reception/requests` | Each visit row, if this endpoint is still supported/used; preserve pagination |
| GET `/api/v1/approvals/pending` | Each request row; null physical values are valid |
| GET `/api/v1/approvals/awaiting-visitor` | Each request row; preserve waiting-list scope |
| GET `/api/v1/approvals/pending-host` | Each request row; preserve host-approval permissions |
| GET `/api/v1/approvals/history` | Each visit-backed history row; approval-action status must not become physical-presence status |
| GET `/api/v1/valet-admin/parking-dashboard` | Each visit in `data[]`; preserve separate dashboard `summary` and role/parking scope |
| GET `/api/v1/reception/search` | Confirm active consumers; if a supported visit-summary endpoint, add the object without changing its existing envelope |
| POST `/api/v1/security/gate/scan` | Confirm whether it returns visit information; if it does, use the same additive summary. Do not change scan authorization/results |

Gate logs remain an event feed. Do not replace event timestamps with visit-level summaries.

Do not introduce one detail/history request per displayed table row. Compute summaries in the backend's normal list query or a batched aggregation, with appropriate indexing and query-budget checks.

### 3.5 History and lifecycle protection

- Preserve `movementHistory` event IDs, event types, `occurredAt`, `recordedAt`, provenance, timezone, and existing ordering contract.
- Keep `administrative_completion` distinct from `checked_out`.
- Do not change existing history missing-value behavior casually: omitted history and an explicitly empty history have different frontend behavior.
- Do not start returning `movementHistory: null` to clients expecting an object or an omitted field.
- Confirm whether completed visits are intentionally excluded by the Valet endpoint. Any change to that policy needs explicit approval and separate acceptance criteria.
- Confirm the stated “9:00 cutoff”: AM/PM, timezone, configuration source, and whether it is hardcoded. This work must not modify that policy.

### 3.6 Required backend handoff

Provide offline, sanitized JSON fixtures for:

1. Each distinct envelope: paginated list, Reception Today, Valet dashboard, approval history, and detail.
2. Every scenario in section 5, including omitted versus explicit-null values.
3. Complete movement history for repeated entry/exit and administrative closure.
4. Old response without `movementSummary` and upgraded response with version 1.
5. Authorized role variants and representative forbidden access.
6. Existing current-cycle fields before/after re-entry, proving their behavior has not changed.

Also provide:

- Contract confirmation for “latest,” timezone, legacy evidence, and missing values.
- Endpoint coverage checklist.
- Migration/backfill approach, if needed; avoid destructive changes.
- Performance evidence for normal page sizes without N+1 queries.
- Existing-client compatibility tests.

## 4. Frontend plan — ordered implementation

### Phase 1: Lock contract and regression baseline

Dependencies: backend confirms section 3 and supplies fixtures.

- Capture existing output and actions for each role before editing.
- Record active table/card variants, response envelopes, and navigation routes.
- Add contract fixtures for old/new payloads without connecting to live APIs.
- Inventory all consumers of current-cycle timestamps, especially presence/action guards.
- Keep unrelated outstanding dashboard, pagination, and date-picker work out of this change.

Acceptance: the agreed contract is documented and existing behavior has regression coverage.

### Phase 2: Add types and a dedicated summary adapter

Relevant areas: `types/api.types.ts`, `types/reception.types.ts`, `types/security.types.ts`, `types/vms.types.ts`, and focused mapping helpers.

- Add optional `movementSummary` fields with explicit version and nullable timestamps.
- Add a pure adapter that distinguishes supported, unsupported, malformed, and empty summaries.
- Preserve the additive summary through every model conversion.
- Do not overwrite `checkedOutAt` or other current-cycle fields with historical OUT.
- A supported `null` must remain absent; never coalesce it to completion or a legacy timestamp.
- Accept OUT earlier than IN.
- Never make a per-row network request or derive the summary from arbitrary history-array positions.

Compatibility rule:

- Keep the new display disabled until required endpoints support it.
- When disabled, preserve existing rendering.
- When enabled, use only a valid version-1 summary for the new semantics.
- If an older endpoint unexpectedly omits the object, mark the summary unavailable/read-only and preserve all unrelated row content/actions. Do not silently claim the old cycle value is the historical summary.
- Decide the exact unavailable indicator and rollout-control mechanism before implementation; do not assume a feature-flag service exists.

Acceptance: pure tests cover old/new/invalid contracts and prove legacy fields remain unchanged.

### Phase 3: Wire lists and tables by role

Use small, reviewable changes with one role family verified before the next.

| Area | Planned changes |
|---|---|
| Employee/Manager My Requests | Preserve new summary in `utils/requestMappers.ts`; bind summary to actual-time display only |
| Shared Overview | Add missing actual-time bindings in `utils/overviewVisitorTable.ts` for upcoming, pending, awaiting and walk-in sections |
| Manager approvals | Add bindings in `utils/managerDashboardTable.ts`; retain approval workflow behavior |
| Manager history | Preserve summary through history mapping and bind in `ManagerAllRequestsScreen`; never reinterpret approval-action status |
| Building Admin | Carry summary through `hooks/queries/useAllRequestsQuery.ts` and `utils/adminAllRequestsTable.ts` |
| Receptionist | Wire Today/dashboard, All Visitors, Walk-ins, and Upcoming maps; preserve endpoint/date/search scope |
| Security list | Preserve summary through `services/api/securityApiService.ts`, screen model, and `utils/securityVisitorTable.ts`; do not repurpose current presence fields |
| Valet Admin | Extend DTO/mapping in `utils/valetAdminVisitorsTable.ts`; preserve parking and operational filters |

Only add Actual In/Out to card variants where explicitly included in the agreed screen scope. Do not redesign unrelated cards or create new routes.

Acceptance: each scoped table displays the independent pair while row count, order, filters, actions, navigation and pagination remain unchanged.

### Phase 4: Separate detail summaries from history and actions

Relevant areas: Employee Request Details, Manager Approval Details, Receptionist Visitor Detail, Security Visitor Detail, and shared timeline helpers.

- Use the new summary only for read-only Actual In/Actual Out presentation.
- Continue using authoritative movement history for the event sequence.
- Continue using existing status/presence contracts for action eligibility.
- Remove completion-as-checkout implications from active legacy timeline branches without hiding genuine movement history.
- Keep administrative completion visible as a separate lifecycle event.
- Treat the shared unused `security_gate` completion fallback separately: confirm reachability before changing it, and test any change.
- Do not convert Valet's local-state legacy detail path into a live API implementation as part of this scope.

Acceptance: completion without checkout never appears as a physical exit; re-entry does not lose earlier exits; existing permissions and action availability are unchanged.

### Phase 5: Consistent actual-time formatting

Relevant areas: `components/shared/VisitorMatrixTable.tsx`, targeted actual-time formatters and affected cards.

- Use absolute timestamps and explicit visit timezone for actual movement displays.
- Use the agreed Riyadh fallback only where timezone is absent; do not use device timezone for business timestamps.
- Preserve existing date-only and planned wall-clock behavior.
- Localize English/Arabic output and keep time/suffix text together.
- Make date information accessible when the latest IN and OUT belong to different dates; agree compact presentation without widening all tables.
- Invalid values must not crash the row or be presented as valid times.

Acceptance: the same movement shows the same business time across Riyadh, Karachi, UTC, and a negative-offset device timezone.

### Phase 6: Refresh and native reconnect

- After successful movement mutations, invalidate only affected detail/list query namespaces using existing role boundaries.
- Verify current Security list keys are refreshed, not only Today/on-site keys.
- Do not broaden permissions or fetch all visits to refresh summaries.
- Check administrative completion and server-side changes without adding excessive polling.
- Confirm native online/focus event wiring; do not assume `refetchOnReconnect: true` alone supplies it.
- Preserve retained rows, query scope, pagination position, active search and error handling.

Acceptance: affected visible summaries update after refetch without clearing active work or creating request storms.

## 5. Mandatory scenario tests

Times below are in the same business timezone.

| Scenario | Actual In | Actual Out |
|---|---|---|
| No movement | — | — |
| IN 09:00 | 09:00 | — |
| OUT 10:00 | 09:00 | 10:00 |
| Re-entry 11:00 | 11:00 | 10:00 |
| OUT 12:00 | 11:00 | 12:00 |
| Re-entry 13:00; administrative completion without another OUT | 13:00 | 12:00 |
| One IN, no OUT, administrative completion | Recorded IN | — |
| QR expires/revokes without physical OUT | Unchanged | Unchanged |

Additional regression coverage:

- Old payload, explicit null, empty string, malformed timestamp, unsupported version.
- Same visit values across list/detail and role-specific envelopes.
- Cross-midnight/cross-date movements and backdated events under the agreed rule.
- Completed/cancelled/expired filtering remains unchanged.
- Approval-history status remains approval status.
- Search, date/status filters, pagination and row identity remain unchanged.
- Current presence, entry/exit eligibility, QR verification and permissions remain unchanged.
- English/Arabic, mobile web, desktop web, iOS and Android.
- Native reconnect and app foregrounding; browser focus.
- Failed refresh, delayed response and overlapping mutations.
- No per-row detail requests; no expanded list downloads; stable query budget.

## 6. Release gates and rollback

1. Deploy the additive backend contract first; leave existing fields and envelopes intact.
2. Verify old clients still work against the upgraded backend.
3. Verify every targeted endpoint with offline fixtures and authorized QA checks.
4. Implement and release frontend support behind an agreed reversible rollout control.
5. Run focused tests, TypeScript checks, web/native bundle builds, and authenticated visual/interaction checks.
6. Verify on real iOS/Android devices or emulators; source tests and successful exports do not prove device behavior.
7. Enable the new display only after all relevant endpoint contracts are ready.
8. Monitor malformed/missing summary responses, errors, latency and request volume without logging personal information.

Rollback:

- Disable the new display path or restore the previous frontend release if regressions appear.
- Keep harmless additive backend fields available for already-updated clients.
- Preserve physical event records; rollback must never delete movement history.
- Avoid destructive schema changes and current-cycle semantic changes so rollback remains practical.

Stop release if:

- Completion produces a physical checkout.
- Historical OUT changes current presence or movement permissions.
- Rows disappear unexpectedly, pagination/filter scope changes, or Valet visibility widens without approval.
- A required endpoint lacks the agreed contract.
- Business time differs across device timezones.
- Old supported clients fail against the upgraded backend.

## 7. Definition of done

The required pair is correct for all scoped roles/screens, independent across cycles, timezone-consistent, and fresh after supported refresh triggers. Historical movement events remain intact. Existing lifecycle, approvals, permissions, QR rules, filters, pagination, and old-client contracts are proven unchanged by tests.

No implementation should be marked complete solely because a DTO or backend endpoint was updated: all required screen bindings and verification must be delivered.

## 8. Frontend preparation status

Frontend contract support is implemented, but rollout is deliberately disabled in `constants/movementSummary.ts`.

Implemented:

- Version-1 summary types and validation; explicit nulls are preserved.
- Propagation through visit, approval, overview, Receptionist, Building Admin, Security, and Valet table mappings.
- Read-only summaries on Employee, Manager, Receptionist, and Security details, separate from lifecycle/history/action logic.
- Visit-timezone formatting with full dates so earlier-cycle/cross-date OUT is distinguishable.
- Existing timestamp display retained while rollout is disabled.
- Missing/malformed/unsupported summaries display “Unavailable” when rollout is enabled, rather than using current-cycle or completion timestamps.
- Active summary-list invalidation after Security/Receptionist movement mutations, gated with rollout.
- Legacy Receptionist timeline no longer treats `completed` alone as physical entry/exit evidence.

Verification:

- TypeScript check passed.
- Focused contract, display, mapping, refresh, and Receptionist detail tests: 357 passed.
- Web workflow rebuilt successfully; iOS and Android exports succeeded.
- Full suite exposed 93 failures in 10 suites; all 93 reproduced on the unchanged starting revision. Those unrelated failures have not been repaired in this work.

Still required before activation:

1. Backend confirmation of field names, version, latest-event semantics, and complete endpoint coverage.
2. Sanitized old/new response fixtures and end-to-end QA for every scenario in section 5.
3. Authenticated table/detail inspection across scoped roles; source tests do not prove the signed-in UI.
4. Native reconnect/foreground behavior verification and any necessary connectivity bridge. No new native connectivity dependency was added in this preparation phase.
5. Real-device/emulator checks for Arabic, cross-date values, row sizing and movement actions.
6. Approve rollout, enable the switch, and verify actual deployed old/new-client compatibility.

Do not enable the switch solely because a backend deployment has finished. Confirm the agreed responses first.
