# Connected parking and reception flow

Gate-display update: movement history now returns `gate: null` for every event.
The reader names/IDs in the earlier examples below are internal audit evidence,
not current response fields. Dates, times and movementBoundary remain unchanged.
Do not display a gate-details line in the timeline.

## Backend contract

The event processor now calls the shared gate policy under the request lock,
using the current schedule and last canonical movement. Raw event, canonical
event, boundary presence and building-state update commit together. Scan sequence
is audit-only. No schema migration is required: existing varchar event fields
and JSON metadata hold the new values.

| Verified event | Canonical audit type | Detail eventType | movementBoundary | Building state |
| --- | --- | --- | --- | --- |
| Parking IN | parking_checked_in | checked_in | parking | Unchanged |
| Reception IN | checked_in | checked_in | reception | checked_in |
| Reception OUT | checked_out | checked_out | reception | completed |

Raw Matrix parking transitions use `parking_in`. They are not building attendance.
Only reception OUT invokes existing checkout lifecycle handling. Administrative
cutoff remains separate from physical departure. There is no parking OUT reader.
Parking permission alone never proves which gate was crossed.

Parking and reception arrival both appear in detail history. Each links to the
same subsequent reception departure through departureEventId. Repeated scans of
the same boundary produce no new canonical movement. A new cycle may begin
within the existing schedule, without requiring another parking scan.

Building checkedInAt/checkedOutAt and the independent latest building IN/OUT
summary are unchanged by parking-only arrivals. A parking arrival after an early
checkout may therefore coexist with the previous completed building cycle until
reception entry. Do not infer site occupancy from building status.

## Frontend handoff

The external frontend/native source is absent here. Consume the existing
movementHistory.data or movement-history endpoint, in returned order:

```json
[
  {"id":"parking-1","eventType":"checked_in","movementBoundary":"parking","gate":{"id":"1:9:1:21","name":"Parking gate"},"departureEventId":"exit-1"},
  {"id":"reception-1","eventType":"checked_in","movementBoundary":"reception","gate":{"id":"1:3:1:21","name":"Reception gate"},"departureEventId":"exit-1"},
  {"id":"exit-1","eventType":"checked_out","movementBoundary":"reception","gate":{"id":"1:4:1:21","name":"Reception gate"}}
]
```

The example omits unchanged timestamps and other envelope fields for brevity.
For current display wording and presentation rules, follow
`timeline-labels-frontend-handoff.md`: render Check In and Checkout without
location prefixes; administrative completion remains Admin closure. Localize the
labels and format occurredAt in the response timezone. Never alternate labels by
array position, deduplicate only by event ID, and do not collapse consecutive
checked_in items across boundaries. Missing movementBoundary means legacy or
manual evidence; keep its existing label rather than guessing a gate.

## Safety and rollout

- Existing verified mapping/version and activation controls remain mandatory and
  unchanged. Provider direction and the approved reader override remain audited.
- Do not start a second worker. Stop/drain older parity workers on every backend
  sharing the database, including the separate mobile backend, before cutover.
- Build from latest source, not a previously compiled dist directory.
- Restore trusted presence only from canonical two-gate metadata or authorized
  post-cutover manual building movement. Legacy parity status is not proof of
  presence; orphan exits remain raw evidence without fabricated entry.
- This change does not reclassify historical records, alter hardware, migrate
  the external database, change activation settings or publish.
- Checkout cleanup retains the existing lifecycle retry mechanism: persisted
  completed visits are eligible for scheduled-end cleanup, and pending expiry
  failures remain retryable. Parking never invokes cleanup.
- Before live activation, verify controlled parking IN/reception IN/reception OUT
  samples, external client rendering, isolated SQL locking/rollback and worker
  cutover. Mocked persistence tests do not prove SQL Server or physical behavior.
- Rollback pauses automatic movement application; never restore scan parity or
  replay old events into current credentials.

## Verification

Offline tests exercise the actual poller persistence path into canonical logs,
history normalization and building summaries, plus duplicate/repeated scans,
parking-only arrival, orphan/late/denied/unknown events, cancellation races,
multiple cycles and administrative cutoff. External client and physical gate
verification remain outside this repository.
