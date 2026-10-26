# First arrival / last departure: version-2 backend handoff

Date: 2026-10-26  
Status: proposed contract for backend acceptance; **not verified against authenticated deployed responses; activation blocked**.

This document supersedes the latest-IN display requirement in
`actual-in-out-backend-requirements-and-frontend-plan.md`. That document and the
existing offline fixtures describe version 1, not evidence of version-2 readiness.
No backend implementation, live API call, rollout, or signed-in UI verification
was performed as part of this handoff.

## 1. Required meaning

- **Actual In:** earliest valid recorded physical check-in for this visit.
- **Actual Out:** latest valid recorded physical checkout for this visit,
  independently of subsequent re-entry.
- These are historical values, never a current-presence pair. After IN 09:00,
  OUT 10:00, IN 11:00, display **09:00 / 10:00**, not 11:00 / 10:00 and not
  09:00 / blank.
- Administrative completion, scheduled end, cancellation, QR activation,
  expiry/revocation and audit-write timestamps are not physical movements.
  None may create a checkout. Building/reception OUT may cause backend lifecycle
  completion, but completion alone is not evidence of OUT.
- Parking has ENTRY readers only. Do not invent parking departure, require a
  parking OUT, or infer movement from scan parity.

## 2. Additive wire proposal — backend acceptance required

Use a separate property so clients that understand only version 1 never receive
a new interpretation of its `latestCheckInAt`:

```ts
interface MovementSummaryV2 {
  version: 2;
  firstCheckInAt: string | null;
  latestCheckOutAt: string | null;
}

interface ProposedVisitHistoryProjection {
  movementSummaryV2?: MovementSummaryV2;
  movementSummaryV2Availability?: 'restricted' | 'unavailable';
  movementSummaryV2Error?: string;
  timezone?: string; // Existing canonical visit IANA timezone.
}
```

This is a wire proposal, not a declaration that these fields exist in production.
Backend owners must explicitly accept these names and the version before frontend
DTOs, adapters or screen bindings are changed.

Keep `movementSummary.version: 1`, `latestCheckInAt` and `latestCheckOutAt`
unchanged for existing clients. If both projections are emitted, version 1 still
reports the latest IN, while version 2 reports the first IN. Do not put version 2
inside the old property, rename the version-1 IN field, or compute first IN from
version-1 data. Both projections must use the same accepted physical-event set.

### Validity and selection

The backend owns event eligibility and computes the minimum accepted check-in
occurrence instant and maximum accepted checkout occurrence instant independently.
Use absolute ISO 8601 timestamps, preferably UTC `Z`; explicit offsets must
represent the same instants. Never select by array position, ingestion order,
`recordedAt`, localized wall time, scheduled times or completion.

Exclude future, synthetic, voided/invalidated and untrustworthy legacy events.
Use deduplicated authoritative physical events under the existing event/provenance
rules. Delayed accepted events and corrections may legitimately change the minimum
or maximum; invalidating the selected event recomputes from remaining evidence.
Unknown evidence produces `null`, not a fabricated historical value. Document
legacy provenance/backfill rules and clock handling before acceptance.

Do not require both fields to be populated or enforce OUT >= IN in the frontend:
incomplete legacy evidence can contain an independently valid OUT without a
trusted IN. Backend fixtures must distinguish that case from malformed data.

### Availability and privacy

| Response | Meaning / eventual display |
|---|---|
| V2 present, both fields `null` | Supported projection, no trustworthy physical timestamps; show dashes |
| V2 property omitted, no marker | Endpoint unsupported; show Unavailable when V2 display is enabled |
| `movementSummaryV2Availability: "restricted"` | Restricted overrides any contradictory values; show Restricted |
| `movementSummaryV2Availability: "unavailable"` | Temporary projection/read failure; show Unavailable |
| V2 `null`, missing required fields, invalid timestamp or marker | Malformed; show Unavailable |
| Unknown version in V2 property | Unsupported version; show Unavailable, never reinterpret |

Markers apply specifically to V2. Existing version-1 restriction/availability
policies must not be bypassed: the backend must apply the same authorization to
both projections. A restricted response should omit V2 timestamps entirely.
Do not fetch detail/history to recover withheld values or broaden cross-host
access. Keep the row and its permitted unrelated fields/actions visible.
Never display or log the arbitrary error string or identifying payloads.

Preserve explicit supported nulls. No fallback from V2 to version 1,
`checkedInAt`, `checkedOutAt`, completion, QR state or a client-derived timeline.

## 3. Endpoint handoff matrix

All rows below are **required for backend confirmation / authenticated QA**, not
assertions of deployment support. Preserve existing envelopes and permissions.
Apply the same projection to the same visit at the same committed event revision.

| Surface / endpoint | Placement and compatibility |
|---|---|
| GET `/api/v1/visits` | Each existing paginated `data[]` visit; My Requests, Building Admin, Receptionist and Security list sources |
| GET `/api/v1/visits/:id` | Existing detail object beside, not instead of, timeline/history |
| GET `/api/v1/reception/today` | Each `data[]` visit; leave `summary` aggregates unchanged |
| GET `/api/v1/reception/requests` | Each visit row if still supported; confirm consumer and retain pagination |
| GET `/api/v1/approvals/pending` | Each request row, including valid null summaries |
| GET `/api/v1/approvals/awaiting-visitor` | Each request row; retain waiting scope |
| GET `/api/v1/approvals/pending-host` | Each request row; retain host permissions |
| GET `/api/v1/approvals/history` | Each visit-backed row; approval status stays separate |
| GET `/api/v1/valet-admin/parking-dashboard` | HTTP `body.data.data[]`, keyed by `requestId`; do not widen active-only/parking scope |
| GET `/api/v1/reception/search` | Confirm supported consumers, then each visit row in unchanged envelope |
| GET `/api/v1/security/lookup` | Existing bare HTTP body; no new lookup consumer for display |
| POST `/api/v1/visits/:id/check-in` and `/check-out` | Existing bare HTTP response; projection or explicit unavailable marker after successful commit |
| POST `/api/v1/security/gate/check-in` and `/check-out` | Same success/projection separation; never retry a committed write to recover summary |

Include every scoped dashboard section/card and detail mapping, not only tables.
Gate logs remain an event feed, not historical summary rows. Do not invoke the
device-activating HTML scan or add a nonexistent POST scan route.

Aggregate within the normal authorized list query or batched projection; no
per-row detail/history calls, count probes, full-list downloads or new polling.
Backend acceptance must state read-after-write/cache guarantees. Prefer
post-commit consistency across all surfaces; any unavoidable bounded lag, its
maximum duration, invalidation mechanism and stale-response protection require
explicit agreement before activation. A summary read failure never reverses a
successful movement.

## 4. Acceptance fixtures and expected values

Times below are Riyadh business time on the same date unless specified.

| Accepted physical evidence / other event | V2 Actual In | V2 Actual Out |
|---|---|---|
| No events | null | null |
| IN 09:00 | 09:00 | null |
| IN 09:00, OUT 10:00 | 09:00 | 10:00 |
| IN 09:00, OUT 10:00, IN 11:00 | 09:00 | 10:00 |
| Above, then OUT 12:00 | 09:00 | 12:00 |
| Above, then IN 13:00, administrative completion | 09:00 | 12:00 |
| IN 09:00, administrative completion without OUT | 09:00 | null |
| Any sequence, then QR expiry/revocation or scheduled end | unchanged | unchanged |
| IN day 1 23:00, OUT day 2 01:00, IN day 2 02:00 | day 1 23:00 | day 2 01:00 |
| Trusted OUT 10:00, no trustworthy IN evidence | null | 10:00 |
| IN 11:00 ingested first, accepted IN 09:00 ingested later | 09:00 | null |
| IN 09:00 voided, valid IN 11:00 remains | 11:00 | recomputed from valid OUT evidence |

Illustrative only — **not captured backend evidence** — after re-entry:

```json
{
  "movementSummary": {
    "version": 1,
    "latestCheckInAt": "2026-10-26T08:00:00.000Z",
    "latestCheckOutAt": "2026-10-26T07:00:00.000Z"
  },
  "movementSummaryV2": {
    "version": 2,
    "firstCheckInAt": "2026-10-26T06:00:00.000Z",
    "latestCheckOutAt": "2026-10-26T07:00:00.000Z"
  },
  "timezone": "Asia/Riyadh"
}
```

The V1 IN is 11:00; V2 IN is 09:00; both OUT values are 10:00.
Current-presence fields intentionally are not specified by this example: retain
the backend's existing values and semantics, including current-cycle OUT clearing.

Backend owners must supply sanitized fixtures for every distinct envelope above,
both versions together, legacy omission, supported null, restricted/unavailable
and contradictory payloads, malformed/future versions, invalid/future/duplicate
events, offset timestamps, corrections and every sequence in the table.
Include complete event history and unchanged current-presence fields before/after
re-entry. Label synthetic fixtures separately from authenticated captures.

## 5. Protected behavior and later frontend work

Until acceptance, keep the runtime unchanged:

- `types/movementSummary.ts` remains version 1.
- `utils/movementSummary.ts` continues interpreting version 1 as latest-IN.
- `components/shared/ActualMovementSummary.tsx` is not relabeled first-IN.
- `constants/movementSummary.ts` stays disabled. Simply enabling its existing
  switch would activate the wrong IN semantics.

After backend readiness is confirmed, add a separate V2 DTO/validated adapter,
carry V2 plus metadata through all list/dashboard/detail mappings, and bind the
read-only pair to V2 under a reversible gate. Test unknown versions, nulls and
restriction precedence before enabling. Legacy payloads may remain operational
but must never masquerade as a supported first-IN summary.

Preserve presence/status fields, action guards, re-entry/access-window rules,
QR authorization, role restrictions, filters, ordering, pagination and row identity.
All physical timeline cycles keep their event IDs, occurrence/recorded timestamps,
provenance, ordering and backend departure-event links. Keep movements between
approval and completion in the same Request Timeline, including pending grey
milestones where unrecorded. Do not synthesize timeline events from either summary.

Use the visit timezone (existing agreed Riyadh fallback only when absent), not the
device timezone. Test dates and English/Arabic output on web/iOS/Android.
Reuse scoped post-mutation/refocus/reconnect refresh behavior without replaying
writes, racing pending reads, losing retained rows or broadening data access.
Existing native summary refresh preparation requires a binary with `expo-network`;
an OTA update alone is not proof of readiness.

## 6. Approval and release record — all gates currently open

| Gate | Evidence required | Current state |
|---|---|---|
| Backend contract acceptance | Owner acceptance of wire names, min-IN/max-OUT, eligibility, legacy evidence, privacy and consistency guarantees | Not supplied |
| Backend deployment coverage | Environment/release and endpoint-by-role matrix, with unchanged V1 compatibility | Not verified |
| Authenticated contract verification | Authorized list/dashboard/detail captures for the same visit before IN, OUT, re-entry and completion; restricted role and forbidden-access checks | Not performed |
| Backend safety/performance | Isolated approved test environment, concurrency/correction/cache tests, query-budget evidence; no production writes for QA | Not supplied |
| Frontend V2 integration | Complete bindings and contract/mapping/display/refresh regressions, typecheck and bundle checks | Intentionally gated |
| Signed-in/platform checks | Roles, English/Arabic, cross-date/timezone cases, failed reads, web and real native actions/reconnect | Not performed |
| Rollout approval | Named release owner approval after the above pass | Blocked |

Repository source, old offline fixtures, successful exports, unauthenticated
responses and a reported backend deployment cannot substitute for authenticated
contract verification. Do not request or store credentials, cookies, tokens or
visitor PII in the evidence. Use approved access and sanitized captures only.

Rollback disables the V2 display and summary-only background work, restoring
legacy presentation without claiming it is first-IN. Keep ordinary operational
refresh working. Preserve both additive backend projections for compatible clients,
all physical event records and current-presence semantics. Never delete history,
replay writes or destructively migrate data as a rollback.
