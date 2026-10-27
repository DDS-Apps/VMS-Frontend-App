# First arrival / last departure: revised V1 backend contract

Status: frontend prepared; serving-backend verification and rollout are blocked.
The backend handoff supplied on 2026-10-27 supersedes the earlier V2 proposal.

## Accepted wire contract

There is no V2 object and no new endpoint:

```json
{
  "movementSummary": {
    "version": 1,
    "latestCheckInAt": "2026-10-25T05:30:00.000Z",
    "latestCheckOutAt": "2026-10-25T09:00:00.000Z"
  },
  "timezone": "Asia/Riyadh"
}
```

- `latestCheckInAt` deliberately retains its old name but now means **first**
  accepted physical arrival, including parking entry.
- `latestCheckOutAt` means latest valid physical checkout, retained across
  subsequent re-entry.
- Both are independently nullable absolute timestamps.
- Operational `checkedInAt`/`checkedOutAt` keep their current-cycle meaning.
  They must not populate or repair these historical display columns.
- The backend chooses eligible events; the frontend neither aggregates history
  nor invents physical events from status, completion, planned end or QR state.
- Use the canonical visit timezone, with the existing Riyadh fallback only when
  absent. Never add offsets manually or use the device timezone.

## Response locations

Under `/api/v1`, existing list envelopes remain unchanged:

- `/visits`, `/reception/today`, `/reception/requests`, `/reception/search`:
  each `body.data[]` row.
- `/approvals/pending`, `/approvals/awaiting-visitor`,
  `/approvals/pending-host`, `/approvals/history`: each `body.data[]` row.
- `/visits/:id`, `/security/lookup`: directly on the body.
- `/valet-admin/parking-dashboard`: each `body.data.data[]` row, using `requestId`.
- Successful `/visits/:id/check-in`, `/visits/:id/check-out`,
  `/security/gate/check-in`, `/security/gate/check-out`: directly on the body
  when available.

Reception desk movement routes remain under `/visits/:id`, not `/reception/:id`.
Preserve existing role access, scopes, pagination, filtering, ordering and IDs.
Do not download full history into overview tables or introduce per-row reads.

## Availability and safety

| Response | Display |
|---|---|
| Valid summary with null timestamp | `—` for that value |
| `movementSummaryAvailability: restricted` | Restricted, even if values contradict the marker |
| `movementSummaryAvailability: unavailable` | Unavailable; normal authorized GET refresh may recover |
| Missing summary without marker | Unsupported older endpoint; Unavailable, not no movements |
| Invalid summary, invalid timezone or unknown version | Unavailable or dash for an unformattable instant; never operational fallback |
| Rollout disabled | Historical columns Unavailable; gated card/detail summaries remain hidden |

A successful movement remains successful if summary loading fails. Refresh only
the existing GET queries; never repeat a movement action to repair its summary.
Full chronological physical history remains in authorized detail/history views,
with stable event IDs and departure links. It is not reconstructed from summaries.

## Acceptance matrix

All times are Riyadh business time:

| Evidence | Actual In | Actual Out |
|---|---|---|
| None | — | — |
| IN 09:00 | 09:00 | — |
| OUT 10:00 | 09:00 | 10:00 |
| Re-entry 11:00 | 09:00 | 10:00 |
| OUT 12:00 | 09:00 | 12:00 |
| Re-entry 13:00 | 09:00 | 12:00 |
| Parking IN 08:30 before reception IN 09:00 | 08:30 | independently supplied checkout |
| Administrative completion without physical OUT | supplied arrival | — |
| Checkout-only evidence | — | supplied checkout |

Also cover dates/timezones, English/Arabic, restricted/failed reads, and successful
movement refresh without replay. Older latest-IN fixtures test wire/envelope
compatibility only; they cannot establish revised first-arrival semantics.

## Release gate

The handoff reports backend source verification, **not** restart or publication.
Both old and revised deployments report `version: 1`; frontend parsing cannot
distinguish their meanings. Leave `MOVEMENT_SUMMARY_ENABLED` false until:

1. The backend owner confirms the serving build/environment implements revised V1.
2. Authorized sanitized list/dashboard/detail responses for one visit demonstrate
   first IN is retained across OUT/re-entry and latest OUT is retained independently.
3. Endpoint/role restrictions, normal refresh, failure handling and query budgets
   are verified without production writes or reader/device activation.
4. Signed-in web and native English/Arabic checks and release approval are complete.

No backend restart, publishing, real-visit mutation or reader activation is
authorized by this frontend handoff. Disabling rollout never deletes events,
changes operational presence, or restores misleading current-cycle fallback.
