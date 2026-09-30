# Visit list status counts (backend extension required)

The frontend no longer probes statuses or downloads pages to calculate totals.
This repository serves the Expo frontend; its Express server serves static files,
not the remote VMS visits API. The backend extension below is not implemented here.

Add an optional `statusCounts` object to `GET /api/v1/visits`:

```json
{
  "data": [],
  "pagination": { "page": 1, "limit": 20, "total": 660, "totalPages": 33 },
  "statusCounts": {
    "pending": 160,
    "approved": 220,
    "in_progress": 60,
    "completed": 120,
    "cancelled": 40,
    "auto_cancelled": 10,
    "rejected": 50
  }
}
```

`data` above is omitted for brevity; production responses contain actual page rows.
Counts must cover all visits within the same authorized building/user population
and inclusive visit-date range as `pagination.total`, not just the current page.
Calculate the aggregate in the database using the same population predicates.
Return all seven keys as nonnegative integers (including zero); their sum must
equal `pagination.total`. Keep list totals and aggregate totals snapshot-consistent.
The aggregate may be included only on page 1; later pages need not recompute it.

Group aliases consistently with `normalizeVisitStatus` in
`utils/adminVisitStatusCounts.ts`. In particular, visitor acceptance is approved,
checked_out is completed, expired is rejected, and auto_cancelled stays separate.
Audit unknown statuses before implementing the backend grouping.

The current Admin list sends date/page parameters and filters status/search locally.
If server-side filtering is introduced later, explicitly distinguish filtered
pagination totals from unfiltered date-scoped tile totals; do not reuse this
reconciliation rule unchanged.

When the field is absent or invalid, the frontend calculates counts from unique
already-loaded rows and labels them as loaded-visit counts while the list is
incomplete. All still shows the server total. Additional pages update those local
counts, but are never requested merely to fill the tiles. Existing analytics
totals are not substituted.