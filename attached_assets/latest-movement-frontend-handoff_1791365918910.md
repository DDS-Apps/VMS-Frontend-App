# Latest Actual IN / OUT — frontend implementation handoff

## Status and scope

Backend implementation in this workspace adds a versioned summary to the existing visitor responses. It is **not yet a verified published contract**. Do not enable the new display against a deployment until its readiness is confirmed.

This document replaces the earlier current-cycle display proposal. Frontend web/iOS/Android sources are not present here and have not been edited. Installed-build compatibility, authenticated UI rendering and real-device behavior remain to be verified by the frontend team.

Only one pair appears on lists, cards, dashboards and overview pages. The complete sequence of repeated entries and exits belongs only on the request detail page.

## 1. Exact contract

```ts
interface MovementSummary {
  version: 1;
  latestCheckInAt: string | null;
  latestCheckOutAt: string | null;
}

interface VisitMovementDisplay {
  movementSummary?: MovementSummary;
  timezone: string; // canonical visit IANA timezone; backend fallback Asia/Riyadh
  movementSummaryAvailability?: "restricted" | "unavailable";
  movementSummaryError?: string;
}
```

Normal authorized example after a later entry:

```json
{
  "id": "example-request",
  "checkedInAt": "2026-10-07T08:00:00.000Z",
  "checkedOutAt": null,
  "movementSummary": {
    "version": 1,
    "latestCheckInAt": "2026-10-07T08:00:00.000Z",
    "latestCheckOutAt": "2026-10-07T07:00:00.000Z"
  },
  "timezone": "Asia/Riyadh"
}
```

This displays **IN 11:00, OUT 10:00** in Riyadh. The old current-cycle OUT remains null while historical OUT survives. The example is illustrative, not a live visitor response.

### Meaning and availability

| Payload | Meaning | Frontend behavior |
|---|---|---|
| version 1 with valid timestamps | Independent latest recorded IN and OUT | Format the two values independently |
| version 1 with either field null | No sufficiently trustworthy evidence for that direction | Display `—`; never fabricate a timestamp |
| Summary omitted, availability `restricted` | This caller cannot access the historical summary | Display a restricted/unavailable indicator; do not infer “never visited” |
| Summary omitted, availability `unavailable` | Movement action succeeded, but its subsequent summary read failed | Keep action successful and refresh detail/list; **do not repeat the movement action** |
| Summary omitted, no availability marker | Older/unsupported endpoint | Treat summary as unsupported; do not silently use current-cycle fields |
| Unknown version, malformed/empty timestamp | Unsupported or invalid contract | Show unavailable safely and report without personal data |

Successful reads otherwise fail explicitly on query failures rather than returning fabricated empty summaries. Null does not prove a visitor never moved; legacy evidence may be insufficient.

**Access safeguard:** operational roles retain their existing endpoint restrictions. Employees receive summaries for their own requests; managers receive their own and managed-team summaries. Existing list rows outside those detail/history scopes remain in the list but have `movementSummaryAvailability: "restricted"` and no summary. No existing list scope, row count, detail permission or history endpoint access was expanded. Valet gets summaries only for the already-returned parking-dashboard rows.

## 2. Endpoint mapping

All paths below begin `/api/v1`. Paths below refer to the **HTTP JSON body**, before Axios/fetch wrappers or application interceptors unwrap it.

| Method / path | Visit row location |
|---|---|
| GET `/visits` | `body.data[]` |
| GET `/visits/:id` | `body` |
| GET `/reception/today` | `body.data[]` |
| GET `/reception/requests` | `body.data[]` |
| GET `/reception/search` | `body.data[]` |
| GET `/approvals/pending` | `body.data[]` |
| GET `/approvals/awaiting-visitor` | `body.data[]` |
| GET `/approvals/pending-host` | `body.data[]` |
| GET `/approvals/history` | `body.data[]` |
| GET `/security/lookup` | `body` |
| GET `/valet-admin/parking-dashboard` | **`body.data.data[]`**; identifier is `requestId` |
| POST `/visits/:id/check-in` | `body`, after successful action |
| POST `/visits/:id/check-out` | `body`, after successful action |
| POST `/security/gate/check-in` | `body`, after successful action |
| POST `/security/gate/check-out` | `body`, after successful action |

Every listed row receives `row.movementSummary` when authorized. No pagination, enclosing dashboard summary, row identity or existing field is renamed.

Examples of envelopes (other existing fields intentionally abbreviated):

```json
{
  "data": [
    {
      "id": "example-request",
      "movementSummary": {
        "version": 1,
        "latestCheckInAt": null,
        "latestCheckOutAt": null
      },
      "timezone": "Asia/Riyadh"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

Reception Today remains `{ "summary": {...}, "data": [...] }`.
Valet remains `{ "success": true, "message": "...", "data": { "summary": {...}, "data": [...] }, "timestamp": "..." }`.
Detail remains a bare object with existing `timeline` and `movementHistory` intact.
Approval-history `status` remains the approval action, **not occupancy**.

**Not summary sources:** aggregate KPI endpoints, Security summary counts and raw gate-event feeds. There is no POST `/security/gate/scan` in this backend. The separate HTML gate scan endpoint can activate devices; never call it merely to obtain display data.

## 3. Required frontend implementation

1. Add optional summary/availability fields to API models and preserve them through all existing row mappings. Do not replace current-cycle properties.
2. Create one pure display adapter that recognizes version 1, explicit null, restricted, temporarily unavailable, unsupported and malformed responses.
3. Bind Actual IN exclusively to `movementSummary.latestCheckInAt`; bind Actual OUT exclusively to `movementSummary.latestCheckOutAt`. Do not use `completedAt`, scheduled end, `checkedOutAt`, array positions or QR expiry as fallbacks.
4. Keep status, action eligibility, checkout capability, current-presence logic and QR behavior on their existing authoritative contracts.
5. Apply the pair to the agreed lists/cards/overview pages for Employee, Manager, Building Admin, Receptionist, Security and Valet Admin. Preserve filters, row order, pagination, parking scope and navigation.
6. Keep all individual cycles and administrative-completion events on request detail only, using its existing history or `/visits/:id/movement-history`. Do not load detail/history once per table row.
7. Format absolute ISO timestamps in `row.timezone`, falling back to `Asia/Riyadh` only if timezone is absent. Do not use device timezone implicitly or double-convert. Support English/Arabic and expose date information for cross-date movements.
8. After successful check-in/out, update from the returned summary where available and invalidate the affected detail/list queries using existing query scopes. If availability is `unavailable`, retry the read, not the action.
9. Verify foreground/reconnect integration on iOS/Android and browser focus. Backend additions do not refresh an already-open screen by themselves.
10. Release backend first, verify required endpoints, then enable the new client display using an agreed reversible rollout mechanism. Do not assume a feature-flag service exists.

No permanent alias matrix or old/new timestamp fallback chain is required. Operational fields remain because their meanings differ, not just to maintain old displays. Old clients may ignore the additive fields; new clients must not mistake old payloads for supported summaries.

## 4. Acceptance scenarios

Times below share one business timezone.

| Scenario | Actual IN | Actual OUT |
|---|---|---|
| No trustworthy movements | — | — |
| Entry 09:00 | 09:00 | — |
| Departure 10:00 | 09:00 | 10:00 |
| Entry 11:00 | 11:00 | **10:00** |
| Departure 12:00 | 11:00 | 12:00 |
| Entry 13:00, then administrative completion without new OUT | 13:00 | **12:00** |
| One entry, no checkout, administrative completion | Recorded IN | — |
| QR expires/revokes without another physical movement | Unchanged | Unchanged |

Also verify: OUT earlier than IN, different dates, completed rows, approval-history statuses, restricted summaries, old payloads, invalid dates, unknown versions, failed refresh and delayed replies. Check identical business times on Riyadh, Karachi, UTC and negative-offset devices.

The stated 9:00 cutoff is not changed by this feature. Do not hardcode AM/PM or a new timezone in the frontend; completion time must never become Actual OUT.

## 5. Evidence and backend implementation notes

- Values are derived from accepted physical-event occurrence times, independently of database insertion order. Backdated insertion contributes its occurrence time, not its insertion time.
- Canonical records require an explicit valid occurrence time. Legacy audit-only timestamps do not become Actual IN/OUT; unsupported history may therefore coexist with a null summary.
- Applied Matrix evidence is reconciled with canonical mirrors; no-op scans and redundant same-presence raw scans are excluded. An accepted recorded entry is not independent proof that a person crossed a physical door.
- Administrative completion is excluded. Explicitly synthetic/voided/invalidated records and known QA-sample descriptions are excluded, and raw mirrors cannot restore excluded canonical evidence.
- Future occurrence times are excluded relative to the projection's clock. No automatic correction/backfill or clock-offset guess is performed. Audit-write time is not used as occurrence time.
- No correction API is introduced. Do not assume arbitrary undocumented supersession metadata is interpreted.
- SQL reads are grouped in batches of 100 distinct returned request IDs: request authorization/timezone, canonical events, applied Matrix evidence. Already-held request locks coordinate the evidence snapshot with writers.
- This removes per-row query fan-out but does not prove production latency: event volume per batch, index effectiveness, SQL isolation/blocking and DB clock behavior still need controlled SQL verification.
- There is no summary cache and no schema migration/backfill in this change. Existing current-cycle fields and history semantics are unchanged.
- Full-list scalar fields and the added evidence projection are separate reads; a concurrent movement can make the new summary newer than an existing scalar field. The two summary timestamps themselves are read from one transactional evidence snapshot per batch.
- A read following a mutation may reflect a later concurrently committed movement. Treat the action's original result as its outcome, and the summary as latest state.

## 6. Validation and release gates

Offline tests exercise the reducer, all supported response placements, preservation of old payload fields, restricted reads, read-failure behavior after successful actions, excluded routes, batched query counts and OpenAPI overlays. Existing movement-history/timeline/lifecycle suites are regression checks.

Verification performed:
- Production backend TypeScript configuration passes: `tsc -p tsconfig.build.json --noEmit`.
- **171 tests passed across seven focused suites**, including **33 new summary tests**: summary, movement history, timeline, cutoff, QR lifecycle, Valet and checkout DTOs.
- Real Nest initialization and Swagger generation under tsx pass in an isolated fixture module, without a database, HTTP listener, schedulers or integrations.
- The repository-wide default `tsc --noEmit` remains failing on test/configuration diagnostics (including missing Jest globals); it is not reported as passing.
- No connected application restart or published deployment verification was performed, to avoid invoking background jobs against real integration targets.

Companion JSON: `docs/actual-entry-exit-evidence/latest-summary-fixtures.json` contains ten offline scenarios and five illustrative envelope shapes per scenario, plus old/restricted/unavailable examples. Envelope examples do not simulate SQL filters: a completed Valet example illustrates shape only, not visibility under its existing active-only query.

Mock-based tests do not establish real SQL concurrency, endpoint latency, installed-client compatibility or physical device behavior. No live QA login, visitor transition, notification, scheduler or Matrix action is part of this validation.

Before enabling the frontend: confirm the backend deployment contains this contract, approve the conservative cross-host restricted-summary behavior, validate query performance/locking on an explicitly approved isolated database, and complete web/native screen and refresh tests.

Rollback the client display without deleting physical events or repurposing operational fields. Keep additive fields available for already-updated clients where possible.
